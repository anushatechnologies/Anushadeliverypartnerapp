import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { partnerTheme } from '@/constants/partnerTheme';
import { useUser, type VerificationStatus } from '@/context/UserContext';
import { authService } from '@/services/authService';
import { sanitizePhone } from '@/utils/partnerFormatters';

const { width } = Dimensions.get('window');
const BOX_SIZE = (width - 48 - 40) / 6;

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; verificationId?: string; from?: string }>();
  const { login } = useUser();
  const inputRef = useRef<TextInput>(null);

  const phone = useMemo(() => sanitizePhone(String(params.phone || '')), [params.phone]);
  const from = String(params.from || 'login');
  const formattedPhone = phone.replace(/(\d{5})(\d{5})/, '$1 $2');

  const [verificationId, setVerificationId] = useState(String(params.verificationId || ''));
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [autoVerifying, setAutoVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);

  // Animations
  const boxScales  = useRef(Array.from({ length: 6 }, () => new Animated.Value(1))).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => inputRef.current?.focus(), 200);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Animated dots for "verifying..." state
  useEffect(() => {
    if (!autoVerifying) {
      dotOpacity.forEach((a) => a.setValue(0.3));
      return;
    }
    const loops = dotOpacity.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 280, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [autoVerifying]); // eslint-disable-line react-hooks/exhaustive-deps

  const animateBox = useCallback((index: number) => {
    Animated.sequence([
      Animated.spring(boxScales[index], { toValue: 1.22, tension: 200, friction: 6, useNativeDriver: true }),
      Animated.spring(boxScales[index], { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [boxScales]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const showSuccessAndNavigate = useCallback((navigate: () => void) => {
    setVerifySuccess(true);
    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
      Animated.timing(successOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setTimeout(navigate, 800);
  }, [successScale, successOpacity]);

  const verifyOtp = useCallback(async (otp?: string) => {
    const finalCode = otp ?? code;
    if (finalCode.length !== 6 || !verificationId) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit code we sent to your mobile.');
      return;
    }

    setLoading(true);
    try {
      const credential = auth.PhoneAuthProvider.credential(verificationId, finalCode);
      const userCredential = await auth().signInWithCredential(credential);
      const idToken = await userCredential.user.getIdToken(true);

      if (from === 'login') {
        let fcmToken = '';
        try {
          const permission = await messaging().requestPermission();
          const canUseFcm =
            permission === messaging.AuthorizationStatus.AUTHORIZED ||
            permission === messaging.AuthorizationStatus.PROVISIONAL;
          if (canUseFcm) fcmToken = await messaging().getToken();
        } catch (_) {}

        const response = await authService.login(idToken, fcmToken || undefined);
        if (response.jwtToken) {
          await AsyncStorage.setItem('@anusha_jwt_token', response.jwtToken);
        }

        const fullName =
          response.fullName ||
          `${response.firstName || ''} ${response.lastName || ''}`.trim() || 'Delivery Partner';
        const verificationStatus =
          ((response.approvalStatus || 'pending').toLowerCase() as VerificationStatus) || 'pending';

        await login(
          sanitizePhone(response.phoneNumber || phone),
          {
            id: response.deliveryPersonId,
            name: fullName,
            vehicleType: response.vehicleType || '',
            vehicleModel: response.vehicleModel || '',
            registrationNumber: response.registrationNumber || '',
            photo: response.profilePhotoUrl || null,
          },
          verificationStatus,
        );

        showSuccessAndNavigate(() => {
          router.replace(verificationStatus === 'approved' ? '/(tabs)' : '/verification');
        });
        return;
      }

      showSuccessAndNavigate(() => {
        router.replace({ pathname: '/register', params: { phone, idToken } });
      });
    } catch (error: any) {
      triggerShake();
      Alert.alert(
        'Verification failed',
        error?.response?.data?.message || error?.message || 'The OTP is invalid or expired.',
      );
      setCode('');
      setAutoVerifying(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    } finally {
      setLoading(false);
    }
  }, [code, verificationId, from, phone, login, router, showSuccessAndNavigate, triggerShake]);

  const handleCodeChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);

    if (digits.length > 0 && digits.length <= 6) {
      animateBox(digits.length - 1);
    }

    if (digits.length === 6 && !loading) {
      setAutoVerifying(true);
      setTimeout(() => verifyOtp(digits), 280);
    } else {
      setAutoVerifying(false);
    }
  }, [animateBox, loading, verifyOtp]);

  const resendOtp = async () => {
    if (!phone) return;
    setResending(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(`+91${phone}`);
      setVerificationId(confirmation.verificationId ?? '');
      setCode('');
      setResendTimer(30);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error: any) {
      Alert.alert('Could not resend OTP', error?.message || 'Please try again in a moment.');
    } finally {
      setResending(false);
    }
  };

  const isVerifying = loading || autoVerifying;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Dark gradient top half */}
      <LinearGradient
        colors={['#0A1F14', '#0E3D29']}
        style={styles.topGradient}
      />

      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: headerOpacity, transform: [{ translateY: headerSlide }] },
          ]}
        >
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Enter OTP</Text>
            <Text style={styles.headerSub}>Sent to +91 {formattedPhone}</Text>
          </View>

          <View style={styles.backBtn} />
        </Animated.View>

        {/* Phone display pill */}
        <Animated.View
          style={[
            styles.phonePill,
            { opacity: headerOpacity },
          ]}
        >
          <MaterialCommunityIcons name="cellphone-message" size={20} color="#14C476" />
          <Text style={styles.phonePillText}>+91 {formattedPhone}</Text>
          <View style={styles.smsTag}>
            <Text style={styles.smsTagText}>SMS</Text>
          </View>
        </Animated.View>

        {/* White card for OTP input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {autoVerifying ? 'Verifying automatically' : 'Enter 6-digit code'}
          </Text>
          <Text style={styles.cardSub}>
            {autoVerifying
              ? 'Checking your code with Firebase...'
              : 'Tap any digit box or just start typing'}
          </Text>

          {/* OTP Boxes */}
          <Pressable onPress={() => !isVerifying && inputRef.current?.focus()}>
            <Animated.View
              style={[styles.boxRow, { transform: [{ translateX: shakeAnim }] }]}
            >
              {Array.from({ length: 6 }).map((_, index) => {
                const digit = code[index] || '';
                const isCurrent = !isVerifying && index === code.length;
                const isFilled = Boolean(digit);
                const isSuccess = isVerifying && isFilled;
                const isDone = verifySuccess && isFilled;

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.otpBox,
                      isFilled && styles.otpBoxFilled,
                      isCurrent && styles.otpBoxCurrent,
                      isSuccess && styles.otpBoxVerifying,
                      isDone && styles.otpBoxDone,
                      { transform: [{ scale: boxScales[index] }] },
                    ]}
                  >
                    {isDone ? (
                      <MaterialCommunityIcons name="check-bold" size={20} color="#16A34A" />
                    ) : (
                      <Text style={[
                        styles.otpDigit,
                        isSuccess && styles.otpDigitVerifying,
                        isDone && styles.otpDigitDone,
                      ]}>
                        {digit}
                      </Text>
                    )}

                    {/* Cursor blink for current box */}
                    {isCurrent && !digit && <View style={styles.cursor} />}
                  </Animated.View>
                );
              })}
            </Animated.View>
          </Pressable>

          {/* Hidden real input */}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            style={styles.hiddenInput}
            editable={!isVerifying && !verifySuccess}
          />

          {/* Auto verify row */}
          {autoVerifying && (
            <View style={styles.autoRow}>
              <View style={styles.dotRow}>
                {dotOpacity.map((anim, i) => (
                  <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
                ))}
              </View>
              <Text style={styles.autoText}>Verifying automatically...</Text>
            </View>
          )}

          {verifySuccess && (
            <Animated.View
              style={[
                styles.successRow,
                { transform: [{ scale: successScale }], opacity: successOpacity },
              ]}
            >
              <LinearGradient colors={['#16A34A', '#22C55E']} style={styles.successPill}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
                <Text style={styles.successText}>Verified! Taking you in...</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Verify button — shown only when not auto-verifying */}
          {!autoVerifying && !verifySuccess && (
            <Pressable
              style={({ pressed }) => [
                styles.verifyBtn,
                code.length !== 6 && styles.verifyBtnDisabled,
                pressed && code.length === 6 && { opacity: 0.88 },
              ]}
              onPress={() => verifyOtp()}
              disabled={code.length !== 6 || loading}
            >
              <LinearGradient
                colors={code.length === 6 ? ['#0E8A63', '#14A06D'] : ['#C4D4CC', '#C4D4CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.verifyBtnInner}
              >
                <MaterialCommunityIcons
                  name={loading ? 'loading' : 'check-circle-outline'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.verifyBtnText}>
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </Text>
              </LinearGradient>
            </Pressable>
          )}

          {/* Resend row */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn&apos;t receive the code?</Text>
            {resendTimer > 0 ? (
              <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
            ) : (
              <Pressable disabled={resending} onPress={resendOtp}>
                <Text style={styles.resendLink}>
                  {resending ? 'Sending...' : 'Resend OTP'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Security note */}
          <View style={styles.securityRow}>
            <MaterialCommunityIcons name="lock-outline" size={13} color={partnerTheme.colors.textSoft} />
            <Text style={styles.securityText}>
              Secured by Firebase Authentication · Never share your OTP
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A1F14' },
  safe: { flex: 1 },
  topGradient: {
    ...StyleSheet.absoluteFillObject as any,
    height: '45%',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },

  // Phone pill
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(20,196,118,0.40)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginBottom: 20,
  },
  phonePillText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  smsTag: {
    backgroundColor: '#14C476',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  smsTagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  cardTitle: {
    color: partnerTheme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  cardSub: {
    color: partnerTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -10,
  },

  // OTP Boxes
  boxRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  otpBox: {
    width: BOX_SIZE,
    height: BOX_SIZE * 1.2,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: partnerTheme.colors.border,
    backgroundColor: partnerTheme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxCurrent: {
    borderColor: partnerTheme.colors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: partnerTheme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  otpBoxFilled: {
    borderColor: partnerTheme.colors.borderStrong,
    backgroundColor: '#FFFFFF',
  },
  otpBoxVerifying: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  otpBoxDone: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  otpDigit: {
    color: partnerTheme.colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  otpDigitVerifying: {
    color: '#B45309',
  },
  otpDigitDone: {
    color: '#16A34A',
  },
  cursor: {
    width: 2,
    height: 28,
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 2,
  },

  hiddenInput: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
  },

  // Auto verify
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: -4,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  autoText: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '700',
  },

  // Success
  successRow: {
    alignItems: 'center',
    marginTop: -4,
  },
  successPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  successText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  // Verify button
  verifyBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0E8A63',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginTop: -4,
  },
  verifyBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },

  // Resend
  resendRow: {
    alignItems: 'center',
    gap: 6,
  },
  resendLabel: {
    color: partnerTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  resendTimer: {
    color: partnerTheme.colors.textSoft,
    fontSize: 14,
    fontWeight: '700',
  },
  resendLink: {
    color: partnerTheme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },

  // Security
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: -6,
  },
  securityText: {
    color: partnerTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
    textAlign: 'center',
  },
});
