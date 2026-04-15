import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { authService } from '@/services/authService';
import { formatPhone, sanitizePhone } from '@/utils/partnerFormatters';
import { WelcomeBackModal } from '@/components/auth/WelcomeBackModal';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ defaultPhone?: string }>();
  const [phone, setPhone] = useState(() => sanitizePhone(String(params.defaultPhone || '')));
  const [loading, setLoading] = useState(false);
  const [redirectingToSignup, setRedirectingToSignup] = useState(false);
  const [signupRedirectCountdown, setSignupRedirectCountdown] = useState(3);
  const [showWelcome, setShowWelcome] = useState(false);

  const sanitizedPhone = useMemo(() => sanitizePhone(phone), [phone]);
  const isValidPhone = sanitizedPhone.length === 10;

  useEffect(() => {
    if (!params.defaultPhone) return;
    setPhone(sanitizePhone(String(params.defaultPhone)));
  }, [params.defaultPhone]);

  useEffect(() => {
    if (!redirectingToSignup || !sanitizedPhone) return;
    setSignupRedirectCountdown(3);
    const interval = setInterval(() => {
      setSignupRedirectCountdown((current) => {
        if (current <= 1) {
          clearInterval(interval);
          router.replace({ pathname: '/register', params: { defaultPhone: sanitizedPhone } });
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [redirectingToSignup, router, sanitizedPhone]);

  const handleSendOtp = async () => {
    if (!isValidPhone) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit mobile number.');
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

      const confirmationPromise = auth().signInWithPhoneNumber(fullPhone);
      setShowWelcome(true);

      let modalDone = false;
      let confirmationResult: any = null;
      const tryNavigate = () => {
        if (modalDone && confirmationResult) {
          router.push({ pathname: '/otp', params: { phone: sanitizedPhone, verificationId: confirmationResult.verificationId, from: 'login' } });
          setLoading(false);
        }
      };

      setTimeout(() => {
        setShowWelcome(false);
        setTimeout(() => { modalDone = true; tryNavigate(); }, 150);
      }, 2600);

      confirmationPromise
        .then((c) => { confirmationResult = c; tryNavigate(); })
        .catch((err) => { setShowWelcome(false); setLoading(false); Alert.alert('Could not send OTP', err?.message || 'Please try again.'); });
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Unable to continue', error?.response?.data?.message || error?.message || 'Please try again.');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <WelcomeBackModal visible={showWelcome} phone={sanitizedPhone} />

      {/* Full-screen gradient background */}
      <LinearGradient
        colors={['#0D1117', '#1F2937', '#111827']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative orbs */}
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Brand section ── */}
            <Animated.View entering={FadeInDown.duration(600)} style={styles.brandSection}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require('@/assets/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brandName}>Anusha Partner</Text>
              <Text style={styles.brandTagline}>Delivery Partner App</Text>

              {/* Trust badges */}
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="shield-check" size={13} color="#4ADE80" />
                  <Text style={styles.badgeText}>Verified & Secure</Text>
                </View>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="lightning-bolt" size={13} color="#FBBF24" />
                  <Text style={styles.badgeText}>Fast Payouts</Text>
                </View>
              </View>
            </Animated.View>

            {/* ── Login card ── */}
            <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.card}>

              {redirectingToSignup ? (
                // ── Redirect notice ──
                <View style={styles.redirectBox}>
                  <View style={styles.redirectIconBox}>
                    <MaterialCommunityIcons name="account-arrow-right-outline" size={32} color="#F97316" />
                  </View>
                  <Text style={styles.redirectTitle}>Account not found</Text>
                  <Text style={styles.redirectSub}>
                    This number isn't registered yet. Taking you to sign up in {signupRedirectCountdown}s...
                  </Text>
                  <View style={styles.redirectProgress}>
                    <View style={[styles.redirectBar, { width: `${((3 - signupRedirectCountdown) / 3) * 100}%` }]} />
                  </View>
                </View>
              ) : (
                // ── Phone input section ──
                <>
                  <Text style={styles.cardTitle}>Welcome back</Text>
                  <Text style={styles.cardSub}>Sign in with your registered number</Text>

                  {/* Phone input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Mobile Number</Text>
                    <View style={styles.inputRow}>
                      <View style={styles.prefixBox}>
                        <Text style={styles.flagEmoji}>🇮🇳</Text>
                        <Text style={styles.prefix}>+91</Text>
                      </View>
                      <TextInput
                        value={formatPhone(phone)}
                        onChangeText={(v) => setPhone(sanitizePhone(v))}
                        keyboardType="phone-pad"
                        maxLength={11}
                        placeholder="XXXXX XXXXX"
                        placeholderTextColor="#484F58"
                        returnKeyType="done"
                        onSubmitEditing={handleSendOtp}
                        style={styles.input}
                        autoComplete="tel"
                        importantForAutofill="yes"
                      />
                      {isValidPhone && (
                        <MaterialCommunityIcons name="check-circle" size={20} color="#4ADE80" style={{ marginRight: 12 }} />
                      )}
                    </View>
                  </View>

                  {/* Send OTP button */}
                  <TouchableOpacity
                    style={[styles.otpBtn, !isValidPhone && styles.otpBtnDisabled]}
                    onPress={handleSendOtp}
                    disabled={!isValidPhone || loading}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.otpBtnText}>Send OTP</Text>
                        <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Sign up link */}
                  <View style={styles.signupRow}>
                    <Text style={styles.signupText}>New partner?</Text>
                    <Pressable onPress={() => router.push('/register')}>
                      <Text style={styles.signupLink}>Create account</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Animated.View>

            {/* ── Features strip ── */}
            <Animated.View entering={FadeInUp.delay(400)} style={styles.featuresRow}>
              {[
                { icon: "motorbike", label: "Fast Delivery" },
                { icon: "currency-inr", label: "Daily Earnings" },
                { icon: "headset", label: "24/7 Support" },
              ].map(({ icon, label }) => (
                <View key={label} style={styles.featureItem}>
                  <MaterialCommunityIcons name={icon as any} size={22} color="#F97316" />
                  <Text style={styles.featureLabel}>{label}</Text>
                </View>
              ))}
            </Animated.View>

            <Text style={styles.footer}>
              By continuing, you agree to our Terms & Privacy Policy
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    justifyContent: 'center',
    minHeight: height * 0.85,
  },

  // Decorative orbs
  orbTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(249,115,22,0.12)',
  },
  orbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(251,191,36,0.07)',
  },

  // Brand section
  brandSection: { alignItems: 'center', marginBottom: 32, paddingTop: 20 },
  logoWrapper: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
    marginBottom: 14,
  },
  logo: { width: 68, height: 68 },
  brandName: { color: '#F0F6FC', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  brandTagline: { color: '#8B949E', fontSize: 13, marginTop: 4, fontWeight: '500' },
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: { color: '#C9D1D9', fontSize: 12, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: '#161B22',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#30363D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  cardTitle: { color: '#E6EDF3', fontSize: 22, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
  cardSub: { color: '#8B949E', fontSize: 14, marginBottom: 24 },

  // Input
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: '#8B949E', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#21262D',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#30363D',
    overflow: 'hidden',
  },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#30363D',
    backgroundColor: '#1C2128',
  },
  flagEmoji: { fontSize: 16 },
  prefix: { color: '#E6EDF3', fontSize: 15, fontWeight: '700' },
  input: {
    flex: 1,
    color: '#E6EDF3',
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 14,
    letterSpacing: 1,
  },

  // OTP button
  otpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F97316',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  otpBtnDisabled: { backgroundColor: '#30363D', shadowOpacity: 0 },
  otpBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#30363D' },
  dividerText: { color: '#484F58', fontSize: 13, fontWeight: '600' },

  // Sign up
  signupRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  signupText: { color: '#8B949E', fontSize: 14 },
  signupLink: { color: '#F97316', fontSize: 14, fontWeight: '800' },

  // Redirect box
  redirectBox: { alignItems: 'center', paddingVertical: 8 },
  redirectIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F9731618',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  redirectTitle: { color: '#E6EDF3', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  redirectSub: { color: '#8B949E', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  redirectProgress: {
    width: '100%',
    height: 4,
    backgroundColor: '#30363D',
    borderRadius: 2,
    overflow: 'hidden',
  },
  redirectBar: { height: '100%', backgroundColor: '#F97316', borderRadius: 2 },

  // Features strip
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 28,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  featureItem: { alignItems: 'center', gap: 6 },
  featureLabel: { color: '#8B949E', fontSize: 11, fontWeight: '600' },

  // Footer
  footer: {
    color: '#484F58',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});
