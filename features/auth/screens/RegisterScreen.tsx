import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  documentLabels,
  vehicleOptions,
} from '@/constants/partnerOnboarding';
import { useUser, type VerificationStatus } from '@/context/UserContext';
import { authService } from '@/services/authService';
import { bankService, type BankOption } from '@/services/bankService';
import { onboardingService } from '@/services/onboardingService';
import { profileService } from '@/services/profileService';
import type {
  RegistrationDocumentKey,
  RegistrationFormValues,
  RegistrationUploads,
  VehicleType,
} from '@/types/partner';
import {
  formatAadhaar,
  formatPhone,
  isValidAadhaar,
  isValidInsuranceNumber,
  isValidLicense,
  isValidPan,
  isValidRcNumber,
  normalizeInsuranceNumber,
  normalizeLicense,
  normalizePan,
  normalizeRcNumber,
  sanitizeAadhaar,
  sanitizePhone,
} from '@/utils/partnerFormatters';

const { width } = Dimensions.get('window');

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg: '#0D1117',
  surface: '#161B22',
  surfaceAlt: '#21262D',
  border: '#30363D',
  text: '#E6EDF3',
  textMuted: '#8B949E',
  textSoft: '#484F58',
  primary: '#F97316',
  primaryGlow: 'rgba(249,115,22,0.12)',
  success: '#2EA043',
  danger: '#F85149',
  inputBg: '#21262D',
};

// ─── Step labels ──────────────────────────────────────────────────────────────
const STEPS = ['Phone', 'Profile', 'Vehicle', 'Documents', 'Bank'];

// ─── Reusable input ───────────────────────────────────────────────────────────
function Field({
  label, value, onChangeText, placeholder, keyboardType, maxLength, autoCapitalize,
  icon, rightSlot, onSubmitEditing, returnKeyType, multiline,
}: any) {
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.row}>
        {icon && (
          <MaterialCommunityIcons name={icon} size={18} color={T.textMuted} style={fieldStyles.icon} />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.textSoft}
          keyboardType={keyboardType || 'default'}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize || 'sentences'}
          autoCorrect={false}
          spellCheck={false}
          returnKeyType={returnKeyType || 'next'}
          onSubmitEditing={onSubmitEditing}
          multiline={multiline}
          style={[fieldStyles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        />
        {rightSlot && <View style={fieldStyles.right}>{rightSlot}</View>}
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: { marginBottom: 12 },
  label: { color: T.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.inputBg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, color: T.text, fontSize: 15, paddingVertical: 13, fontWeight: '500' },
  right: { marginLeft: 8 },
});

// ─── Upload card ──────────────────────────────────────────────────────────────
function UploadBtn({ title, imageUri, onPress }: { title: string; imageUri?: string | null; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={uploadStyles.card} activeOpacity={0.8}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={uploadStyles.preview} resizeMode="cover" />
      ) : (
        <View style={uploadStyles.placeholder}>
          <MaterialCommunityIcons name="upload-outline" size={24} color={T.primary} />
          <Text style={uploadStyles.uploadText}>Upload {title}</Text>
        </View>
      )}
      {imageUri && (
        <View style={uploadStyles.doneOverlay}>
          <MaterialCommunityIcons name="check-circle" size={20} color="#2EA043" />
          <Text style={uploadStyles.doneText}>{title} ✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const uploadStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: T.inputBg,
    minHeight: 80,
    justifyContent: 'center',
  },
  preview: { width: '100%', height: 120 },
  placeholder: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  uploadText: { color: T.primary, fontSize: 14, fontWeight: '600' },
  doneOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D281822',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  doneText: { color: '#2EA043', fontSize: 13, fontWeight: '600' },
});

// ─── Vehicle option card ──────────────────────────────────────────────────────
function VehicleCard({ label, icon, selected, onPress }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[vCardStyles.card, selected && vCardStyles.cardSelected]}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons name={icon} size={28} color={selected ? T.primary : T.textMuted} />
      <Text style={[vCardStyles.label, selected && vCardStyles.labelSelected]}>{label}</Text>
      {selected && (
        <MaterialCommunityIcons name="check-circle" size={16} color={T.primary} style={{ marginTop: 4 }} />
      )}
    </TouchableOpacity>
  );
}

const vCardStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    backgroundColor: T.surfaceAlt,
  },
  cardSelected: { borderColor: T.primary, backgroundColor: T.primaryGlow },
  label: { color: T.textMuted, fontSize: 12, fontWeight: '600', marginTop: 6 },
  labelSelected: { color: T.primary },
});

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ currentStep, total }: { currentStep: number; total: number }) {
  return (
    <View style={stepStyles.bar}>
      {STEPS.map((label, i) => (
        <View key={i} style={stepStyles.item}>
          <View style={[
            stepStyles.circle,
            i < currentStep && stepStyles.circleDone,
            i === currentStep && stepStyles.circleActive,
          ]}>
            {i < currentStep
              ? <MaterialCommunityIcons name="check" size={12} color="#fff" />
              : <Text style={[stepStyles.circleText, i === currentStep && stepStyles.circleTextActive]}>{i + 1}</Text>
            }
          </View>
          {i < total - 1 && (
            <View style={[stepStyles.line, i < currentStep && stepStyles.lineDone]} />
          )}
        </View>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 4 },
  item: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1.5,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { backgroundColor: T.success, borderColor: T.success },
  circleActive: { backgroundColor: T.primary, borderColor: T.primary },
  circleText: { color: T.textMuted, fontSize: 11, fontWeight: '800' },
  circleTextActive: { color: '#fff' },
  line: { flex: 1, height: 2, backgroundColor: T.border, marginHorizontal: 3 },
  lineDone: { backgroundColor: T.success },
});

// ─── Validation helpers ───────────────────────────────────────────────────────
const validIcon = (has: boolean, valid: boolean) =>
  has ? (
    <MaterialCommunityIcons
      name={valid ? 'check-circle' : 'alert-circle-outline'}
      size={18}
      color={valid ? '#2EA043' : '#F85149'}
    />
  ) : null;

// ─── Empty uploads ────────────────────────────────────────────────────────────
const emptyUploads: RegistrationUploads = {
  profilePhoto: null, aadhaarFront: null, aadhaarBack: null,
  panCard: null, drivingLicense: null, rcBook: null, insurance: null,
};

// ─── Main component ────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ defaultPhone?: string; phone?: string; idToken?: string }>();
  const { login } = useUser();

  const initialPhone = useMemo(
    () => sanitizePhone(String(params.phone || params.defaultPhone || '')),
    [params.defaultPhone, params.phone],
  );

  const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(
    params.idToken ? String(params.idToken) : null,
  );
  const [currentStep, setCurrentStep] = useState<number>(params.idToken ? 1 : 0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [redirectingToLogin, setRedirectingToLogin] = useState(false);
  const [form, setForm] = useState<RegistrationFormValues>({
    firstName: '', lastName: '', phone: initialPhone,
    vehicleType: 'BIKE', vehicleModel: '', registrationNumber: '',
    aadhaarNumber: '', panNumber: '', drivingLicenseNumber: '', insuranceNumber: '',
  });
  const [uploads, setUploads] = useState<RegistrationUploads>(emptyUploads);

  // Bank state
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankConfirmNumber, setBankConfirmNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [bankSearching, setBankSearching] = useState(false);
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [bankSelected, setBankSelected] = useState(false);
  const bankSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialPhone && form.phone !== initialPhone) setForm((c) => ({ ...c, phone: initialPhone }));
  }, [initialPhone]);

  useEffect(() => {
    if (params.idToken) {
      setFirebaseIdToken(String(params.idToken));
      setCurrentStep((s) => (s < 1 ? 1 : s));
    }
  }, [params.idToken]);

  useEffect(() => {
    if (!redirectingToLogin) return;
    const t = setTimeout(() => {
      router.replace({ pathname: '/login', params: { defaultPhone: sanitizePhone(form.phone) } });
    }, 1350);
    return () => clearTimeout(t);
  }, [form.phone, redirectingToLogin, router]);

  const phoneVerified = Boolean(firebaseIdToken);
  const isValidPhone = sanitizePhone(form.phone).length === 10;
  const isEV = form.vehicleType === 'EV';

  const aadhaarDigits = sanitizeAadhaar(form.aadhaarNumber);
  const aadhaarValid = isValidAadhaar(aadhaarDigits);
  const panValid = isValidPan(form.panNumber.trim());
  const dlValid = isValidLicense(form.drivingLicenseNumber.trim());
  const rcValid = isValidRcNumber(form.registrationNumber.trim());
  const insuranceValid = isValidInsuranceNumber(form.insuranceNumber.trim());

  const updateField = <K extends keyof RegistrationFormValues>(key: K, value: RegistrationFormValues[K]) =>
    setForm((c) => ({ ...c, [key]: value }));

  const updateUpload = (key: RegistrationDocumentKey, uri: string | null) =>
    setUploads((c) => ({ ...c, [key]: uri }));

  const pickImage = async (key: RegistrationDocumentKey, source: 'camera' | 'library') => {
    try {
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert('Permission required', 'Allow access to attach documents.'); return; }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });
      if (!result.canceled && result.assets?.[0]?.uri) updateUpload(key, result.assets[0].uri);
    } catch (e: any) { Alert.alert('Upload error', e?.message || 'Could not access file.'); }
  };

  const chooseUpload = (key: RegistrationDocumentKey) => {
    Alert.alert('Add document', 'Choose source', [
      { text: 'Camera', onPress: () => pickImage(key, 'camera') },
      { text: 'Device Files', onPress: () => pickImage(key, 'library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const sendSignupOtp = async () => {
    const normalized = sanitizePhone(form.phone);
    if (normalized.length !== 10) { Alert.alert('Invalid number', 'Enter a valid 10-digit mobile number.'); return; }
    setSendingOtp(true);
    try {
      const fullPhone = `+91${normalized}`;
      const status = await authService.checkPhone(fullPhone);
      if (status?.exists) { setRedirectingToLogin(true); return; }
      const conf = await auth().signInWithPhoneNumber(fullPhone);
      router.push({ pathname: '/otp', params: { phone: normalized, verificationId: conf.verificationId, from: 'register' } });
    } catch (e: any) {
      Alert.alert('Could not send OTP', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally { setSendingOtp(false); }
  };

  const validatePersonalStep = () => {
    if (!phoneVerified) { Alert.alert('Required', 'Verify mobile number first.'); return false; }
    if (!form.firstName.trim() || !form.lastName.trim()) { Alert.alert('Required', 'Enter first and last name.'); return false; }
    if (!uploads.profilePhoto) { Alert.alert('Required', 'Add a selfie for admin review.'); return false; }
    return true;
  };

  const validateVehicleStep = () => {
    if (!form.vehicleModel.trim()) { Alert.alert('Required', 'Enter vehicle model.'); return false; }
    if (!isEV && !rcValid) { Alert.alert('Required', 'Enter a valid registration number.'); return false; }
    return true;
  };

  const validateDocumentsStep = () => {
    if (!aadhaarValid) { Alert.alert('Invalid', 'Aadhaar must have 12 digits.'); return false; }
    if (!panValid) { Alert.alert('Invalid', 'PAN format: ABCDE1234F'); return false; }
    if (!dlValid) { Alert.alert('Invalid', 'Enter a valid driving license number.'); return false; }
    if (!onboardingService.hasRequiredUploads(uploads, form.vehicleType)) { Alert.alert('Missing', 'Upload all required documents.'); return false; }
    if (uploads.insurance && !form.insuranceNumber) { Alert.alert('Required', 'Add the insurance policy number.'); return false; }
    if (form.insuranceNumber && !insuranceValid) { Alert.alert('Invalid', 'Check insurance number format.'); return false; }
    return true;
  };

  const validateBankStep = () => {
    if (!bankAccountName.trim()) { Alert.alert('Required', 'Enter account holder name.'); return false; }
    if (!bankSelected || !bankName.trim()) { Alert.alert('Required', 'Select your bank.'); return false; }
    if (bankAccountNumber.length < 9) { Alert.alert('Invalid', 'Account number must be at least 9 digits.'); return false; }
    if (bankAccountNumber !== bankConfirmNumber) { Alert.alert('Mismatch', 'Account numbers do not match.'); return false; }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(bankIfscCode)) { Alert.alert('Invalid IFSC', 'Format: SBIN0001234'); return false; }
    return true;
  };

  const goNext = () => {
    if (currentStep === 1 && !validatePersonalStep()) return;
    if (currentStep === 2 && !validateVehicleStep()) return;
    if (currentStep === 3 && !validateDocumentsStep()) return;
    setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const submitRegistration = async () => {
    if (!firebaseIdToken) { Alert.alert('Required', 'Verify mobile number again.'); return; }
    if (!validateBankStep()) return;
    setSubmitting(true);
    try {
      const response = await onboardingService.completeRegistration({ firebaseIdToken, form, uploads });
      const verificationStatus = ((response.approvalStatus || 'pending').toLowerCase() as VerificationStatus) || 'pending';
      const fullName = response.fullName || `${response.firstName || form.firstName} ${response.lastName || form.lastName}`.trim();

      await login(sanitizePhone(response.phoneNumber || form.phone), {
        id: response.deliveryPersonId,
        name: fullName,
        vehicleType: response.vehicleType || form.vehicleType,
        vehicleModel: response.vehicleModel || form.vehicleModel,
        registrationNumber: response.registrationNumber || form.registrationNumber,
        photo: response.profilePhotoUrl || uploads.profilePhoto,
        bankName, accountName: bankAccountName, accountNumber: bankAccountNumber,
        ifscCode: bankIfscCode.toUpperCase(),
      }, verificationStatus);

      try {
        await profileService.updateBankDetails({
          accountName: bankAccountName.trim(), accountNumber: bankAccountNumber.trim(),
          bankName: bankName.trim(), ifscCode: bankIfscCode.toUpperCase().trim(),
        });
      } catch {}

      Alert.alert('Application Submitted!', 'Your partner account is under admin review.', [
        { text: 'Continue', onPress: () => router.replace('/verification') },
      ]);
    } catch (e: any) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message || null;
      Alert.alert('Submission failed', serverMsg || e?.message || 'Please try again.');
    } finally { setSubmitting(false); }
  };

  const searchBanks = (q: string) => {
    setBankSearchQuery(q);
    setBankDropdownOpen(true);
    setBankSelected(false);
    setBankName('');
    if (bankSearchTimer.current) clearTimeout(bankSearchTimer.current);
    setBankSearching(true);
    bankSearchTimer.current = setTimeout(async () => {
      try {
        const results = await bankService.search(q);
        setBankOptions(results);
      } catch { setBankOptions([]); } finally { setBankSearching(false); }
    }, 350);
  };

  const selectBank = (bank: BankOption) => {
    setBankName(bank.name);
    setBankSearchQuery(bank.name);
    setBankSelected(true);
    setBankDropdownOpen(false);
    setBankOptions([]);
    if (!bankIfscCode && bank.ifscPrefix) setBankIfscCode(bank.ifscPrefix + '0');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0D1117', '#1F2937', '#111827']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      {/* Decorative orbs */}
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => currentStep > 0 ? setCurrentStep((s) => s - 1) : router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={T.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Create Account</Text>
            <Text style={styles.headerSub}>Step {currentStep + 1} of {STEPS.length} — {STEPS[currentStep]}</Text>
          </View>
          <TouchableOpacity onPress={() => router.replace('/login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Login</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={20}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step bar */}
            <StepBar currentStep={currentStep} total={STEPS.length} />

            {/* ── Step 0: Phone ── */}
            {currentStep === 0 && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={styles.stepTitle}>Verify your number</Text>
                <Text style={styles.stepSub}>OTP will be sent to confirm your identity</Text>

                {redirectingToLogin && (
                  <View style={styles.noticeBanner}>
                    <MaterialCommunityIcons name="account-check" size={18} color="#F97316" />
                    <Text style={styles.noticeText}>Account already exists — redirecting to login...</Text>
                  </View>
                )}

                <View style={styles.phoneRow}>
                  <View style={styles.prefixBox}>
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                    <Text style={styles.prefix}>+91</Text>
                  </View>
                  <TextInput
                    value={formatPhone(form.phone)}
                    onChangeText={(v) => updateField('phone', sanitizePhone(v))}
                    keyboardType="phone-pad"
                    maxLength={11}
                    placeholder="XXXXX XXXXX"
                    placeholderTextColor={T.textSoft}
                    style={styles.phoneInput}
                    returnKeyType="done"
                    onSubmitEditing={sendSignupOtp}
                    autoComplete="tel"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, !isValidPhone && styles.primaryBtnDisabled]}
                  onPress={sendSignupOtp}
                  disabled={!isValidPhone || sendingOtp || redirectingToLogin}
                >
                  {sendingOtp ? <ActivityIndicator color="#fff" /> : (
                    <><Text style={styles.primaryBtnText}>Send OTP</Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" /></>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ── Step 1: Personal Info ── */}
            {currentStep === 1 && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={styles.stepTitle}>Your profile</Text>
                <Text style={styles.stepSub}>Add your name and a selfie for admin verification</Text>

                <View style={styles.verifiedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={14} color="#2EA043" />
                  <Text style={styles.verifiedText}>+91 {formatPhone(form.phone)} verified</Text>
                </View>

                <UploadBtn
                  title="Profile photo (selfie)"
                  imageUri={uploads.profilePhoto}
                  onPress={() => chooseUpload('profilePhoto')}
                />

                <Field label="First name" icon="account-outline" value={form.firstName}
                  onChangeText={(v: string) => updateField('firstName', v)} placeholder="First name" />
                <Field label="Last name" icon="badge-account-horizontal-outline" value={form.lastName}
                  onChangeText={(v: string) => updateField('lastName', v)} placeholder="Last name" />

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(0)}>
                    <MaterialCommunityIcons name="arrow-left" size={18} color={T.textMuted} />
                    <Text style={styles.secondaryBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtnHalf} onPress={goNext}>
                    <Text style={styles.primaryBtnText}>Next</Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* ── Step 2: Vehicle ── */}
            {currentStep === 2 && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={styles.stepTitle}>Vehicle details</Text>
                <Text style={styles.stepSub}>Choose your delivery vehicle type</Text>

                <View style={styles.vehicleGrid}>
                  {vehicleOptions.map((v) => (
                    <VehicleCard
                      key={v.value}
                      label={v.label}
                      icon={v.icon}
                      selected={form.vehicleType === v.value}
                      onPress={() => updateField('vehicleType', v.value as VehicleType)}
                    />
                  ))}
                </View>

                <Field label="Vehicle model" icon="bike-fast" value={form.vehicleModel}
                  onChangeText={(v: string) => updateField('vehicleModel', v)} placeholder="e.g. Honda Shine" />

                {isEV && (
                  <View style={styles.evNotice}>
                    <MaterialCommunityIcons name="lightning-bolt" size={16} color="#2EA043" />
                    <Text style={styles.evNoticeText}>EV partners: RC Book & Insurance not required</Text>
                  </View>
                )}

                {!isEV && (
                  <Field
                    label="Registration number"
                    icon="card-text-outline"
                    value={form.registrationNumber}
                    onChangeText={(v: string) => updateField('registrationNumber', normalizeRcNumber(v))}
                    placeholder="e.g. AP39XY1234"
                    autoCapitalize="characters"
                    maxLength={20}
                    rightSlot={validIcon(Boolean(form.registrationNumber.trim()), rcValid)}
                  />
                )}

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(1)}>
                    <MaterialCommunityIcons name="arrow-left" size={18} color={T.textMuted} />
                    <Text style={styles.secondaryBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtnHalf} onPress={goNext}>
                    <Text style={styles.primaryBtnText}>Next</Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* ── Step 3: Documents ── */}
            {currentStep === 3 && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={styles.stepTitle}>KYC Documents</Text>
                <Text style={styles.stepSub}>Upload clear photos of your ID documents</Text>

                {/* Aadhaar */}
                <View style={styles.docSection}>
                  <Text style={styles.docSectionTitle}>Aadhaar Card</Text>
                  <Field label="Aadhaar number" icon="card-account-details-outline"
                    keyboardType="number-pad" value={formatAadhaar(form.aadhaarNumber)}
                    onChangeText={(v: string) => updateField('aadhaarNumber', sanitizeAadhaar(v))}
                    placeholder="XXXX XXXX XXXX" maxLength={14}
                    rightSlot={validIcon(aadhaarDigits.length > 0, aadhaarValid)} />
                  <View style={styles.uploadPair}>
                    <View style={{ flex: 1 }}>
                      <UploadBtn title="Aadhaar Front" imageUri={uploads.aadhaarFront} onPress={() => chooseUpload('aadhaarFront')} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <UploadBtn title="Aadhaar Back" imageUri={uploads.aadhaarBack} onPress={() => chooseUpload('aadhaarBack')} />
                    </View>
                  </View>
                </View>

                {/* PAN */}
                <View style={styles.docSection}>
                  <Text style={styles.docSectionTitle}>PAN Card</Text>
                  <Field label="PAN number" icon="card-bulleted-outline" value={form.panNumber}
                    onChangeText={(v: string) => updateField('panNumber', normalizePan(v))}
                    placeholder="ABCDE1234F" autoCapitalize="characters" maxLength={10}
                    rightSlot={validIcon(Boolean(form.panNumber.trim()), panValid)} />
                  <UploadBtn title="PAN Card" imageUri={uploads.panCard} onPress={() => chooseUpload('panCard')} />
                </View>

                {/* Driving License */}
                <View style={styles.docSection}>
                  <Text style={styles.docSectionTitle}>Driving License</Text>
                  <Field label="License number" icon="card-account-phone-outline" value={form.drivingLicenseNumber}
                    onChangeText={(v: string) => updateField('drivingLicenseNumber', normalizeLicense(v))}
                    placeholder="AP0320260001234" autoCapitalize="characters" maxLength={16}
                    rightSlot={validIcon(Boolean(form.drivingLicenseNumber.trim()), dlValid)} />
                  <UploadBtn title="Driving License" imageUri={uploads.drivingLicense} onPress={() => chooseUpload('drivingLicense')} />
                </View>

                {/* RC Book (non-EV) */}
                {!isEV ? (
                  <View style={styles.docSection}>
                    <Text style={styles.docSectionTitle}>RC Book</Text>
                    <UploadBtn title="RC Book" imageUri={uploads.rcBook} onPress={() => chooseUpload('rcBook')} />
                  </View>
                ) : (
                  <View style={styles.evNotice}>
                    <MaterialCommunityIcons name="lightning-bolt-circle" size={16} color="#2EA043" />
                    <Text style={styles.evNoticeText}>RC Book not required for Electric Bike</Text>
                  </View>
                )}

                {/* Insurance (optional for non-EV) */}
                {!isEV && (
                  <View style={styles.docSection}>
                    <Text style={styles.docSectionTitle}>Insurance (Optional)</Text>
                    <Field label="Policy number" icon="shield-outline" value={form.insuranceNumber}
                      onChangeText={(v: string) => updateField('insuranceNumber', normalizeInsuranceNumber(v))}
                      placeholder="Policy number" autoCapitalize="characters" maxLength={30}
                      rightSlot={form.insuranceNumber ? validIcon(true, insuranceValid) : null} />
                    <UploadBtn title="Insurance Doc" imageUri={uploads.insurance} onPress={() => chooseUpload('insurance')} />
                  </View>
                )}

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(2)}>
                    <MaterialCommunityIcons name="arrow-left" size={18} color={T.textMuted} />
                    <Text style={styles.secondaryBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtnHalf} onPress={goNext}>
                    <Text style={styles.primaryBtnText}>Next</Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* ── Step 4: Bank Details ── */}
            {currentStep === 4 && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={styles.stepTitle}>Bank account</Text>
                <Text style={styles.stepSub}>Your earnings will be deposited here</Text>

                <Field label="Account holder name" icon="account-outline" value={bankAccountName}
                  onChangeText={setBankAccountName} placeholder="Name as on bank account" />

                {/* Bank search */}
                <View style={fieldStyles.group}>
                  <Text style={fieldStyles.label}>Bank Name</Text>
                  <View style={fieldStyles.row}>
                    <MaterialCommunityIcons name="bank-outline" size={18} color={T.textMuted} style={fieldStyles.icon} />
                    <TextInput
                      value={bankSearchQuery}
                      onChangeText={searchBanks}
                      placeholder="Search your bank..."
                      placeholderTextColor={T.textSoft}
                      style={fieldStyles.input}
                    />
                    {bankSelected && <MaterialCommunityIcons name="check-circle" size={18} color="#2EA043" style={fieldStyles.right} />}
                  </View>
                  {bankDropdownOpen && (
                    <View style={styles.dropdown}>
                      {bankSearching ? (
                        <ActivityIndicator color={T.primary} style={{ padding: 12 }} />
                      ) : bankOptions.length === 0 ? (
                        <Text style={[styles.dropdownItem, { color: T.textMuted }]}>No banks found</Text>
                      ) : (
                        bankOptions.slice(0, 6).map((b, i) => (
                          <TouchableOpacity key={i} onPress={() => selectBank(b)} style={styles.dropdownRow}>
                            <Text style={styles.dropdownItem}>{b.name}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </View>

                <Field label="Account number" icon="numeric" keyboardType="number-pad" value={bankAccountNumber}
                  onChangeText={setBankAccountNumber} placeholder="Account number" />
                <Field label="Confirm account number" icon="numeric" keyboardType="number-pad" value={bankConfirmNumber}
                  onChangeText={setBankConfirmNumber} placeholder="Re-enter account number"
                  rightSlot={bankConfirmNumber ? validIcon(true, bankAccountNumber === bankConfirmNumber) : null} />
                <Field label="IFSC code" icon="identifier" value={bankIfscCode}
                  onChangeText={(v: string) => setBankIfscCode(v.toUpperCase())} placeholder="e.g. SBIN0001234"
                  autoCapitalize="characters" maxLength={11}
                  rightSlot={bankIfscCode.length >= 11 ? validIcon(true, /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(bankIfscCode)) : null} />

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(3)}>
                    <MaterialCommunityIcons name="arrow-left" size={18} color={T.textMuted} />
                    <Text style={styles.secondaryBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryBtnHalf, { backgroundColor: '#2EA043' }]} onPress={submitRegistration} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#fff" /> : (
                      <><Text style={styles.primaryBtnText}>Submit</Text>
                      <MaterialCommunityIcons name="check" size={18} color="#fff" /></>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  orbTop: { position: 'absolute', top: -80, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(249,115,22,0.1)' },
  orbBottom: { position: 'absolute', bottom: -100, left: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(251,191,36,0.06)' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: T.text, fontSize: 16, fontWeight: '800' },
  headerSub: { color: T.textMuted, fontSize: 12, marginTop: 1 },
  loginLink: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: T.primaryGlow },
  loginLinkText: { color: T.primary, fontSize: 13, fontWeight: '800' },

  // Scroll
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },

  // Step title
  stepTitle: { color: T.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  stepSub: { color: T.textMuted, fontSize: 14, marginBottom: 20 },

  // Phone input
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: T.border,
    backgroundColor: '#1C2128',
  },
  flagEmoji: { fontSize: 16 },
  prefix: { color: T.text, fontSize: 15, fontWeight: '700' },
  phoneInput: {
    flex: 1,
    color: T.text,
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 14,
    letterSpacing: 1,
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: T.primary,
    borderRadius: 16,
    paddingVertical: 15,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnDisabled: { backgroundColor: T.surfaceAlt, shadowOpacity: 0 },
  primaryBtnHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: T.primary,
    borderRadius: 14,
    paddingVertical: 13,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    paddingVertical: 13,
    marginRight: 8,
  },
  secondaryBtnText: { color: T.textMuted, fontSize: 15, fontWeight: '700' },
  btnRow: { flexDirection: 'row', marginTop: 20 },

  // Notice / verified
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9731618',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: { color: T.primary, fontSize: 13, fontWeight: '600', flex: 1 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D281822',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  verifiedText: { color: '#2EA043', fontSize: 12, fontWeight: '700' },

  // Vehicle grid
  vehicleGrid: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },

  // EV notice
  evNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D281822',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  evNoticeText: { color: '#2EA043', fontSize: 13, fontWeight: '600', flex: 1 },

  // Documents
  docSection: { marginBottom: 16 },
  docSectionTitle: {
    color: T.primary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 2,
  },
  uploadPair: { flexDirection: 'row' },

  // Bank dropdown
  dropdown: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  dropdownItem: { color: T.text, fontSize: 14 },
});
