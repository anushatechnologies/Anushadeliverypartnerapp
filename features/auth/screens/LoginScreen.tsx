import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { PartnerButton } from '@/components/auth/PartnerButton';
import { PartnerFlowNotice } from '@/components/auth/PartnerFlowNotice';
import { PartnerInput } from '@/components/auth/PartnerInput';
import { WelcomeBackModal } from '@/components/auth/WelcomeBackModal';
import { partnerTheme } from '@/constants/partnerTheme';
import { authService } from '@/services/authService';
import { formatPhone, sanitizePhone } from '@/utils/partnerFormatters';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ defaultPhone?: string }>();
  const [phone, setPhone] = useState(() => sanitizePhone(String(params.defaultPhone || '')));
  const [loading, setLoading] = useState(false);
  const [redirectingToSignup, setRedirectingToSignup] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const pendingNavRef = useRef<(() => void) | null>(null);

  const sanitizedPhone = useMemo(() => sanitizePhone(phone), [phone]);
  const isValidPhone = sanitizedPhone.length === 10;

  useEffect(() => {
    if (!params.defaultPhone) return;
    setPhone(sanitizePhone(String(params.defaultPhone)));
  }, [params.defaultPhone]);

  useEffect(() => {
    if (!redirectingToSignup || !sanitizedPhone) return;
    const timer = setTimeout(() => {
      router.replace({ pathname: '/register', params: { defaultPhone: sanitizedPhone } });
    }, 1350);
    return () => clearTimeout(timer);
  }, [redirectingToSignup, router, sanitizedPhone]);

  const handleSendOtp = async () => {
    if (!isValidPhone) {
      Alert.alert('Invalid mobile', 'Enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${sanitizedPhone}`;
      const status = await authService.checkPhone(fullPhone);

      if (!status?.exists) {
        setRedirectingToSignup(true);
        setLoading(false);
        return;
      }

      // Fire OTP in background while showing welcome modal
      const confirmationPromise = auth().signInWithPhoneNumber(fullPhone);
      setShowWelcome(true);
      pendingNavRef.current = null;

      confirmationPromise
        .then((confirmation) => {
          pendingNavRef.current = () => {
            router.push({
              pathname: '/otp',
              params: {
                phone: sanitizedPhone,
                verificationId: confirmation.verificationId,
                from: 'login',
              },
            });
          };
        })
        .catch((err) => {
          setShowWelcome(false);
          setLoading(false);
          Alert.alert('Could not send OTP', err?.message || 'Please try again.');
        });

      // Auto-dismiss after 2.6s then navigate
      setTimeout(() => {
        setShowWelcome(false);
        setTimeout(() => {
          pendingNavRef.current?.();
          setLoading(false);
        }, 150);
      }, 2600);

    } catch (error: any) {
      setLoading(false);
      Alert.alert(
        'Unable to continue',
        error?.response?.data?.message || error?.message || 'OTP could not be sent right now.',
      );
    }
  };

  return (
    <AuthScaffold
      eyebrow="Login"
      title="Welcome back, partner"
      subtitle="Use the same mobile number you registered with. We will send a secure OTP and restore your backend-linked session."
      onBackPress={() => router.back()}
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New to Anusha partner delivery?</Text>
          <Pressable onPress={() => router.push('/register')}>
            <Text style={styles.footerLink}>Create account</Text>
          </Pressable>
        </View>
      }
    >
      {/* WelcomeBackModal renders as native Modal overlay — position in tree doesn't matter */}
      <WelcomeBackModal visible={showWelcome} phone={sanitizedPhone} />

      {redirectingToSignup ? (
        <PartnerFlowNotice
          variant="info"
          icon="account-arrow-right-outline"
          title="Partner account not found"
          description="This mobile number is not registered in delivery partner accounts yet."
          caption="Opening signup flow"
        />
      ) : null}

      <PartnerInput
        label="Mobile number"
        icon="phone-outline"
        keyboardType="phone-pad"
        maxLength={11}
        prefix="+91"
        value={formatPhone(phone)}
        onChangeText={(value) => setPhone(sanitizePhone(value))}
        placeholder="XXXXX XXXXX"
        helperText="Only registered partner numbers can sign in here."
        returnKeyType="done"
        onSubmitEditing={handleSendOtp}
      />

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>What happens next</Text>
        <Text style={styles.noteText}>1. OTP verification</Text>
        <Text style={styles.noteText}>2. Session sync with backend</Text>
        <Text style={styles.noteText}>3. Dashboard or approval screen based on your status</Text>
      </View>

      <PartnerButton
        label="Send OTP"
        icon="arrow-right"
        loading={loading}
        disabled={!isValidPhone || redirectingToSignup}
        onPress={handleSendOtp}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  noteCard: {
    borderRadius: partnerTheme.radius.md,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    backgroundColor: '#F8FBF8',
    padding: 16,
    gap: 6,
  },
  noteTitle: {
    color: partnerTheme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  noteText: {
    color: partnerTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  footerText: {
    color: partnerTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  footerLink: {
    color: partnerTheme.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});
