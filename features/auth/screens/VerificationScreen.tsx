import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { PartnerButton } from '@/components/auth/PartnerButton';
import { partnerTheme } from '@/constants/partnerTheme';
import { useUser } from '@/context/UserContext';
import { profileService } from '@/services/profileService';
import firebase from '@/app/config/firebase';

export default function VerificationScreen() {
  const router = useRouter();
  const { authState, setVerificationStatus, updateProfile, logout } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [photoRemarks, setPhotoRemarks] = useState<string | null>(null);
  const [overview, setOverview] = useState<Record<string, any>>({});
  const [isLive, setIsLive] = useState(false);

  // Pulse animation for "live" indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const statusLabel = useMemo(() => {
    if (authState.verificationStatus === 'approved') return 'Approved';
    if (authState.verificationStatus === 'rejected') return 'Rejected';
    return 'Under review';
  }, [authState.verificationStatus]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const loadStatus = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await profileService.getStatus();
      const onboardingStatus = response?.onboardingStatus || response?.completionStatus || {};
      const deliveryPerson = response?.deliveryPerson;
      const approvalStatus = String(deliveryPerson?.approvalStatus || 'PENDING').toLowerCase();

      setOverview(onboardingStatus);
      setPhotoStatus(
        String(onboardingStatus?.photoStatus || deliveryPerson?.profilePhotoStatus || '').toUpperCase() || null,
      );
      setPhotoRemarks(onboardingStatus?.photoRemarks || deliveryPerson?.profilePhotoRemarks || null);

      if (deliveryPerson?.profilePhotoUrl) {
        await updateProfile({ photo: deliveryPerson.profilePhotoUrl });
      }

      if (approvalStatus === 'approved') {
        await setVerificationStatus('approved');
        router.replace('/(tabs)');
        return;
      }

      if (approvalStatus === 'rejected') {
        await setVerificationStatus('rejected');
      } else {
        await setVerificationStatus('pending');
      }
    } catch (error) {
      console.warn('Verification status fetch failed', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatus();
    startPulse();

    const userId = authState.user?.id;
    let rtdbUnsubscribe: (() => void) | null = null;

    // Firebase RTDB real-time listener — instant when admin approves/rejects
    if (userId) {
      try {
        const db = firebase.database();
        const statusRef = db.ref(`delivery-status/${userId}`);
        statusRef.on(
          'value',
          (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            const rtdbStatus = String(data.approvalStatus || '').toUpperCase();
            if (rtdbStatus === 'APPROVED' || rtdbStatus === 'REJECTED') {
              loadStatus();
            }
          },
          (error: Error) => {
            console.warn('RTDB listener error', error);
          }
        );
        setIsLive(true);
        rtdbUnsubscribe = () => statusRef.off('value');
      } catch (e) {
        console.warn('RTDB setup failed, using polling only', e);
      }
    }

    // FCM foreground message listener — triggers reload when push arrives
    let fcmUnsubscribe: (() => void) | null = null;
    try {
      const messaging = require('@react-native-firebase/messaging').default;
      fcmUnsubscribe = messaging().onMessage(async (remoteMessage: any) => {
        const title = remoteMessage?.notification?.title || '';
        if (title.includes('Approved') || title.includes('Rejected')) {
          await loadStatus();
        }
      });
    } catch (e) {
      // messaging not available
    }

    // AppState: reload when app comes back to foreground
    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') loadStatus();
    });

    // 60-second fallback poll (reduced from 20s — real-time listener handles instant updates)
    const interval = setInterval(() => loadStatus(), 60000);

    return () => {
      rtdbUnsubscribe?.();
      fcmUnsubscribe?.();
      appStateSub.remove();
      clearInterval(interval);
    };
  }, []);

  const reuploadProfilePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow camera access to capture a new profile photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      setPhotoUploading(true);
      const response = await profileService.updateProfilePhoto(result.assets[0].uri);
      const nextPhotoUrl =
        response?.photoUrl || response?.profilePhotoUrl || response?.deliveryPerson?.profilePhotoUrl;
      if (nextPhotoUrl) await updateProfile({ photo: nextPhotoUrl });

      Alert.alert('Photo submitted', 'Your new profile photo has been sent for admin review.');
      await loadStatus();
    } catch (error: any) {
      Alert.alert(
        'Upload failed',
        error?.response?.data?.message || error?.message || 'Could not submit the photo right now.',
      );
    } finally {
      setPhotoUploading(false);
    }
  };

  if (loading) {
    return (
      <AuthScaffold
        eyebrow="Verification"
        title="Checking your approval status"
        subtitle="We are syncing your partner status with the backend."
      >
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={partnerTheme.colors.primary} />
          <Text style={styles.loaderText}>Fetching partner status...</Text>
        </View>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      eyebrow="Verification"
      title={statusLabel}
      subtitle="Track admin approval, see what is still pending, and reupload your selfie if the review team asks for it."
    >
      <View style={styles.stack}>
        {/* Live indicator */}
        <View style={styles.liveRow}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim, backgroundColor: isLive ? '#22C55E' : '#F59E0B' }]} />
          <Text style={[styles.liveText, { color: isLive ? '#166534' : '#92400E' }]}>
            {isLive ? 'Live — you will be notified instantly when admin acts' : 'Polling every 60 s — waiting for real-time connection'}
          </Text>
        </View>

        <View style={styles.statusBanner}>
          <View style={styles.statusIconWrap}>
            <MaterialCommunityIcons
              name={authState.verificationStatus === 'approved' ? 'check-decagram' : 'progress-clock'}
              size={24}
              color={partnerTheme.colors.primary}
            />
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>{statusLabel}</Text>
            <Text style={styles.statusText}>
              {authState.verificationStatus === 'approved'
                ? 'Your profile is approved. We are taking you to the live partner dashboard.'
                : 'You can log in, monitor status, and finish any pending uploads while admin review is in progress.'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <SummaryLine label="Profile complete" value={overview?.personalInfoCompleted ? 'Yes' : 'Pending'} />
          <SummaryLine label="Documents submitted" value={overview?.documentsUploaded ? 'Yes' : 'Pending'} />
          <SummaryLine label="Ready for final approval" value={overview?.readyForFinalApproval ? 'Yes' : 'No'} />
          <SummaryLine
            label="Approved docs"
            value={`${overview?.approvedRequiredDocumentCount ?? 0}/${overview?.requiredDocumentCount ?? 0}`}
          />
        </View>

        {(photoStatus === 'REJECTED' || photoStatus === 'NEEDS_REUPLOAD') && (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Profile photo needs attention</Text>
            <Text style={styles.alertText}>
              {photoRemarks || 'The admin team requested a clearer selfie. Capture a fresh front-facing photo to continue.'}
            </Text>
            <PartnerButton
              label="Capture new selfie"
              icon="camera-outline"
              loading={photoUploading}
              onPress={reuploadProfilePhoto}
            />
          </View>
        )}

        <PartnerButton
          label={refreshing ? 'Refreshing...' : 'Refresh status'}
          variant="secondary"
          icon="refresh"
          disabled={refreshing}
          onPress={() => loadStatus(true)}
        />
        <PartnerButton
          label="Logout"
          variant="secondary"
          icon="logout"
          onPress={logout}
        />
      </View>
    </AuthScaffold>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 32,
  },
  loaderText: {
    color: partnerTheme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  stack: {
    gap: 16,
    paddingBottom: 8,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  statusBanner: {
    borderRadius: partnerTheme.radius.md,
    backgroundColor: '#F8FBF8',
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#E7F6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCopy: {
    flex: 1,
  },
  statusTitle: {
    color: partnerTheme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  statusText: {
    color: partnerTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: partnerTheme.radius.md,
    backgroundColor: partnerTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 16,
    gap: 12,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    color: partnerTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    color: partnerTheme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  alertCard: {
    borderRadius: partnerTheme.radius.md,
    backgroundColor: '#FFF4F4',
    borderWidth: 1,
    borderColor: '#F3CACA',
    padding: 16,
    gap: 12,
  },
  alertTitle: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '800',
  },
  alertText: {
    color: '#7F1D1D',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
});
