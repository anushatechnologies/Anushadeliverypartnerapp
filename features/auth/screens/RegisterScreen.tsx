import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { PartnerButton } from '@/components/auth/PartnerButton';
import { PartnerFlowNotice } from '@/components/auth/PartnerFlowNotice';
import { PartnerInput } from '@/components/auth/PartnerInput';
import { StepProgress } from '@/components/auth/StepProgress';
import { UploadCard } from '@/components/auth/UploadCard';
import { VehicleOptionCard } from '@/components/auth/VehicleOptionCard';
import {
  documentLabels,
  registrationSteps,
  vehicleOptions,
  getRequiredDocumentKeys,
} from '@/constants/partnerOnboarding';
import { partnerTheme } from '@/constants/partnerTheme';
import { useUser, type VerificationStatus } from '@/context/UserContext';
import { authService } from '@/services/authService';
import { onboardingService } from '@/services/onboardingService';
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

const emptyUploads: RegistrationUploads = {
  profilePhoto: null,
  aadhaarFront: null,
  aadhaarBack: null,
  panCard: null,
  drivingLicense: null,
  rcBook: null,
  insurance: null,
};

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
    firstName: '',
    lastName: '',
    phone: initialPhone,
    vehicleType: 'BIKE',
    vehicleModel: '',
    registrationNumber: '',
    aadhaarNumber: '',
    panNumber: '',
    drivingLicenseNumber: '',
    insuranceNumber: '',
  });
  const [uploads, setUploads] = useState<RegistrationUploads>(emptyUploads);

  useEffect(() => {
    if (initialPhone && form.phone !== initialPhone) {
      setForm((current) => ({ ...current, phone: initialPhone }));
    }
  }, [form.phone, initialPhone]);

  useEffect(() => {
    if (params.idToken) {
      setFirebaseIdToken(String(params.idToken));
      setCurrentStep((step) => (step < 1 ? 1 : step));
    }
  }, [params.idToken]);

  useEffect(() => {
    if (!redirectingToLogin) return;

    const timer = setTimeout(() => {
      router.replace({
        pathname: '/login',
        params: { defaultPhone: sanitizePhone(form.phone) },
      });
    }, 1350);

    return () => clearTimeout(timer);
  }, [form.phone, redirectingToLogin, router]);

  const phoneVerified = Boolean(firebaseIdToken);
  const isValidPhone = sanitizePhone(form.phone).length === 10;
  const aadhaarDigits = sanitizeAadhaar(form.aadhaarNumber);
  const panValue = form.panNumber.trim();
  const drivingLicenseValue = form.drivingLicenseNumber.trim();
  const registrationValue = form.registrationNumber.trim();
  const insuranceValue = form.insuranceNumber.trim();

  const aadhaarValid = isValidAadhaar(aadhaarDigits);
  const panValid = isValidPan(panValue);
  const drivingLicenseValid = isValidLicense(drivingLicenseValue);
  const registrationValid = isValidRcNumber(registrationValue);
  const insuranceValid = isValidInsuranceNumber(insuranceValue);

  const isEV = form.vehicleType === 'EV';

  const personalStepComplete =
    phoneVerified && Boolean(form.firstName.trim()) && Boolean(form.lastName.trim()) && Boolean(uploads.profilePhoto);
  // EV doesn't require a registration number
  const vehicleStepComplete = isEV
    ? Boolean(form.vehicleModel.trim())
    : Boolean(form.vehicleModel.trim()) && Boolean(registrationValue) && registrationValid;
  const documentsStepComplete =
    aadhaarValid &&
    panValid &&
    drivingLicenseValid &&
    onboardingService.hasRequiredUploads(uploads, form.vehicleType) &&
    insuranceValid &&
    (!uploads.insurance || Boolean(insuranceValue));

  const stepCompletion = [
    phoneVerified && isValidPhone,
    personalStepComplete,
    vehicleStepComplete,
    documentsStepComplete,
  ];

  // EV: show info notice in the vehicle step
  const evNotice = isEV ? (
    <View style={styles.evNotice}>
      <MaterialCommunityIcons name="lightning-bolt" size={18} color="#22c55e" />
      <Text style={styles.evNoticeText}>
        Electric Bike partners do not need to upload RC Book or Insurance. Only Aadhaar, PAN, and Driving License are required.
      </Text>
    </View>
  ) : null;

  const renderValidationIcon = (hasValue: boolean, isValid: boolean) => {
    if (!hasValue) return null;

    return (
      <MaterialCommunityIcons
        name={isValid ? 'check-circle' : 'alert-circle-outline'}
        size={20}
        color={isValid ? partnerTheme.colors.success : partnerTheme.colors.danger}
      />
    );
  };

  const aadhaarHelperText = aadhaarDigits.length === 0
    ? 'Backend format: exactly 12 digits. Example: 1234 5678 9012'
    : aadhaarValid
      ? 'Matches backend rule: exactly 12 digits.'
      : `Backend format: exactly 12 digits. ${12 - aadhaarDigits.length} digit${12 - aadhaarDigits.length === 1 ? '' : 's'} remaining.`;

  const panHelperText = panValue.length === 0
    ? 'Backend format: 5 letters + 4 digits + 1 letter. Example: ABCDE1234F'
    : panValid
      ? 'Matches backend PAN format.'
      : 'Use backend PAN format: ABCDE1234F';

  const drivingLicenseHelperText = drivingLicenseValue.length === 0
    ? 'Backend format: 10-16 uppercase letters and numbers. Example: DL1234567890'
    : drivingLicenseValid
      ? 'Matches backend driving license format.'
      : 'Use 10-16 uppercase letters and numbers only.';

  const registrationHelperText = registrationValue.length === 0
    ? 'Backend RC format: 6-20 uppercase letters, numbers, or hyphens. Example: AP39XY1234'
    : registrationValid
      ? 'Matches backend RC/registration format.'
      : 'Use 6-20 uppercase letters, numbers, or hyphens.';

  const insuranceHelperText = insuranceValue.length === 0
    ? 'Optional. If entered, backend accepts 6-30 uppercase letters, numbers, or hyphens.'
    : insuranceValid
      ? 'Matches backend insurance format.'
      : 'Use 6-30 uppercase letters, numbers, or hyphens.';

  const updateField = <K extends keyof RegistrationFormValues>(key: K, value: RegistrationFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateUpload = (key: RegistrationDocumentKey, uri: string | null) => {
    setUploads((current) => ({ ...current, [key]: uri }));
  };

  const chooseUpload = (key: RegistrationDocumentKey) => {
    Alert.alert('Upload document', 'Choose how you want to add this file.', [
      {
        text: 'Camera',
        onPress: () => pickImage(key, 'camera'),
      },
      {
        text: 'Device files',
        onPress: () => pickImage(key, 'library'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async (key: RegistrationDocumentKey, source: 'camera' | 'library') => {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access so we can attach the document.');
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.5 })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });

      if (!result.canceled && result.assets?.[0]?.uri) {
        updateUpload(key, result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Upload cancelled', error?.message || 'We could not access that file right now.');
    }
  };

  const sendSignupOtp = async () => {
    const normalizedPhone = sanitizePhone(form.phone);
    if (normalizedPhone.length !== 10) {
      Alert.alert('Invalid mobile', 'Enter a valid 10-digit mobile number first.');
      return;
    }

    setSendingOtp(true);
    try {
      const fullPhone = `+91${normalizedPhone}`;
      const status = await authService.checkPhone(fullPhone);
      if (status?.exists) {
        setRedirectingToLogin(true);
        return;
      }

      const confirmation = await auth().signInWithPhoneNumber(fullPhone);
      router.push({
        pathname: '/otp',
        params: {
          phone: normalizedPhone,
          verificationId: confirmation.verificationId,
          from: 'register',
        },
      });
    } catch (error: any) {
      Alert.alert(
        'Could not send OTP',
        error?.response?.data?.message || error?.message || 'Please try again in a moment.',
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const validatePersonalStep = () => {
    if (!phoneVerified) {
      Alert.alert('Verify mobile first', 'Complete OTP verification before filling the rest of the form.');
      return false;
    }

    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Name required', 'Please enter your first name and last name.');
      return false;
    }

    if (!uploads.profilePhoto) {
      Alert.alert('Profile photo required', 'Add a clear selfie for admin review.');
      return false;
    }

    return true;
  };

  const validateVehicleStep = () => {
    if (!form.vehicleModel.trim()) {
      Alert.alert('Vehicle details required', 'Enter your vehicle model.');
      return false;
    }

    if (!isEV) {
      if (!form.registrationNumber.trim()) {
        Alert.alert('Registration number required', 'Enter your vehicle registration (RC) number.');
        return false;
      }
      if (!isValidRcNumber(form.registrationNumber.trim())) {
        Alert.alert('Invalid registration number', 'Use a valid registration or RC number format.');
        return false;
      }
    }

    return true;
  };

  const validateDocumentsStep = () => {
    if (!isValidAadhaar(sanitizeAadhaar(form.aadhaarNumber))) {
      Alert.alert('Invalid Aadhaar', 'Aadhaar number must contain exactly 12 digits.');
      return false;
    }

    if (!isValidPan(form.panNumber)) {
      Alert.alert('Invalid PAN', 'PAN number should match the format ABCDE1234F.');
      return false;
    }

    if (!isValidLicense(form.drivingLicenseNumber)) {
      Alert.alert('Invalid driving license', 'Enter a valid driving license number.');
      return false;
    }

    if (!onboardingService.hasRequiredUploads(uploads, form.vehicleType)) {
      Alert.alert('Missing uploads', 'Please attach all required documents before submitting.');
      return false;
    }

    if (form.insuranceNumber && !isValidInsuranceNumber(form.insuranceNumber)) {
      Alert.alert('Invalid insurance number', 'Insurance number format looks incomplete.');
      return false;
    }

    if (uploads.insurance && !form.insuranceNumber) {
      Alert.alert('Insurance number required', 'Add the policy number for the uploaded insurance document.');
      return false;
    }

    return true;
  };

  const goNext = () => {
    if (currentStep === 1 && !validatePersonalStep()) return;
    if (currentStep === 2 && !validateVehicleStep()) return;
    setCurrentStep((step) => Math.min(step + 1, 3));
  };

  const submitRegistration = async () => {
    if (!firebaseIdToken) {
      Alert.alert('Verification required', 'Please verify your mobile number again.');
      return;
    }

    if (!validateDocumentsStep()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await onboardingService.completeRegistration({
        firebaseIdToken,
        form,
        uploads,
      });

      const verificationStatus =
        ((response.approvalStatus || 'pending').toLowerCase() as VerificationStatus) || 'pending';
      const fullName =
        response.fullName ||
        `${response.firstName || form.firstName} ${response.lastName || form.lastName}`.trim();

      await login(
        sanitizePhone(response.phoneNumber || form.phone),
        {
          id: response.deliveryPersonId,
          name: fullName,
          vehicleType: response.vehicleType || form.vehicleType,
          vehicleModel: response.vehicleModel || form.vehicleModel,
          registrationNumber: response.registrationNumber || form.registrationNumber,
          photo: response.profilePhotoUrl || uploads.profilePhoto,
        },
        verificationStatus,
      );

      Alert.alert(
        'Application submitted',
        'Your partner account has been created and sent for admin verification.',
        [{ text: 'Continue', onPress: () => router.replace('/verification') }],
      );
    } catch (error: any) {
      const isNetworkError = error?.message === 'Network Error';
      const serverMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        null;

      Alert.alert(
        isNetworkError ? 'Connection failed' : 'Submission failed',
        isNetworkError
          ? 'Could not reach the server. Please check your internet connection and try again.'
          : serverMsg || error?.message || 'We could not complete signup right now.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="Partner signup"
      title="Create your delivery profile"
      subtitle="Verify mobile, fill your profile, choose your vehicle, and upload KYC in a clean step-by-step flow."
      onBackPress={() => router.back()}
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already registered?</Text>
          <Text style={styles.footerLink} onPress={() => router.replace('/login')}>
            Login here
          </Text>
        </View>
      }
    >
      <StepProgress steps={registrationSteps} activeIndex={currentStep} completedSteps={stepCompletion} />

      {currentStep === 0 ? (
        <View style={styles.sectionStack}>
          {redirectingToLogin ? (
            <PartnerFlowNotice
              variant="success"
              icon="account-check-outline"
              title="Partner account found"
              description="This mobile number is already registered in the delivery partner backend."
              caption="Taking you to login"
            />
          ) : null}

          <PartnerInput
            label="Mobile number"
            icon="phone-outline"
            keyboardType="phone-pad"
            maxLength={11}
            prefix="+91"
            value={formatPhone(form.phone)}
            onChangeText={(value) => updateField('phone', sanitizePhone(value))}
            placeholder="XXXXX XXXXX"
            helperText="We use OTP verification before creating the partner account."
            returnKeyType="done"
          />

          <View style={styles.verifyCard}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color={partnerTheme.colors.primary} />
            <Text style={styles.verifyText}>This number must not already be registered in the partner backend.</Text>
          </View>

          <PartnerButton
            label="Verify mobile with OTP"
            icon="arrow-right"
            loading={sendingOtp}
            disabled={!isValidPhone || redirectingToLogin}
            onPress={sendSignupOtp}
          />
        </View>
      ) : null}

      {currentStep === 1 ? (
        <View style={styles.sectionStack}>
          <View style={styles.lockedPhoneCard}>
            <Text style={styles.lockedPhoneLabel}>Verified mobile</Text>
            <Text style={styles.lockedPhoneValue}>+91 {formatPhone(form.phone)}</Text>
          </View>

          <UploadCard
            title={documentLabels.profilePhoto.title}
            subtitle={documentLabels.profilePhoto.subtitle}
            helper={documentLabels.profilePhoto.helper}
            imageUri={uploads.profilePhoto}
            onPress={() => chooseUpload('profilePhoto')}
          />

          <PartnerInput
            label="First name"
            icon="account-outline"
            value={form.firstName}
            onChangeText={(value) => updateField('firstName', value)}
            placeholder="Enter your first name"
          />
          <PartnerInput
            label="Last name"
            icon="badge-account-horizontal-outline"
            value={form.lastName}
            onChangeText={(value) => updateField('lastName', value)}
            placeholder="Enter your last name"
          />

          <View style={styles.buttonRow}>
            <PartnerButton
              label="Back"
              variant="secondary"
              icon="arrow-left"
              style={styles.rowButton}
              onPress={() => setCurrentStep(0)}
            />
            <PartnerButton
              label="Next"
              icon="arrow-right"
              style={styles.rowButton}
              onPress={goNext}
            />
          </View>
        </View>
      ) : null}

      {currentStep === 2 ? (
        <View style={styles.sectionStack}>
          <View style={styles.vehicleStack}>
            {vehicleOptions.map((vehicle) => (
              <VehicleOptionCard
                key={vehicle.value}
                label={vehicle.label}
                description={vehicle.description}
                icon={vehicle.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                selected={form.vehicleType === vehicle.value}
                onPress={() => updateField('vehicleType', vehicle.value as VehicleType)}
              />
            ))}
          </View>

          <PartnerInput
            label="Vehicle model"
            icon="bike-fast"
            value={form.vehicleModel}
            onChangeText={(value) => updateField('vehicleModel', value)}
            placeholder="Ex: Honda Shine or Bajaj Auto"
          />
          {evNotice}

          {!isEV ? (
            <PartnerInput
              label="Registration number"
              icon="card-text-outline"
              value={form.registrationNumber}
              onChangeText={(value) => updateField('registrationNumber', normalizeRcNumber(value))}
              placeholder="Ex: AP39XY1234"
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              maxLength={20}
              helperText={registrationHelperText}
              rightSlot={renderValidationIcon(Boolean(registrationValue), registrationValid)}
            />
          ) : null}

          <View style={styles.buttonRow}>
            <PartnerButton
              label="Back"
              variant="secondary"
              icon="arrow-left"
              style={styles.rowButton}
              onPress={() => setCurrentStep(1)}
            />
            <PartnerButton
              label="Next"
              icon="arrow-right"
              style={styles.rowButton}
              onPress={goNext}
            />
          </View>
        </View>
      ) : null}

      {currentStep === 3 ? (
        <View style={styles.sectionStack}>
          <PartnerInput
            label="Aadhaar number"
            icon="card-account-details-outline"
            keyboardType="number-pad"
            value={formatAadhaar(form.aadhaarNumber)}
            onChangeText={(value) => updateField('aadhaarNumber', sanitizeAadhaar(value))}
            placeholder="XXXX XXXX XXXX"
            returnKeyType="done"
            maxLength={14}
            helperText={aadhaarHelperText}
            rightSlot={renderValidationIcon(aadhaarDigits.length > 0, aadhaarValid)}
          />
          <UploadCard
            title={documentLabels.aadhaarFront.title}
            subtitle={documentLabels.aadhaarFront.subtitle}
            helper={documentLabels.aadhaarFront.helper}
            imageUri={uploads.aadhaarFront}
            onPress={() => chooseUpload('aadhaarFront')}
          />
          <UploadCard
            title={documentLabels.aadhaarBack.title}
            subtitle={documentLabels.aadhaarBack.subtitle}
            helper={documentLabels.aadhaarBack.helper}
            imageUri={uploads.aadhaarBack}
            onPress={() => chooseUpload('aadhaarBack')}
          />

          <PartnerInput
            label="PAN number"
            icon="card-bulleted-outline"
            value={form.panNumber}
            onChangeText={(value) => updateField('panNumber', normalizePan(value))}
            placeholder="ABCDE1234F"
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="done"
            maxLength={10}
            helperText={panHelperText}
            rightSlot={renderValidationIcon(Boolean(panValue), panValid)}
          />
          <UploadCard
            title={documentLabels.panCard.title}
            subtitle={documentLabels.panCard.subtitle}
            helper={documentLabels.panCard.helper}
            imageUri={uploads.panCard}
            onPress={() => chooseUpload('panCard')}
          />

          <PartnerInput
            label="Driving license"
            icon="card-account-phone-outline"
            value={form.drivingLicenseNumber}
            onChangeText={(value) => updateField('drivingLicenseNumber', normalizeLicense(value))}
            placeholder="AP0320260001234"
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="done"
            maxLength={16}
            helperText={drivingLicenseHelperText}
            rightSlot={renderValidationIcon(Boolean(drivingLicenseValue), drivingLicenseValid)}
          />
          <UploadCard
            title={documentLabels.drivingLicense.title}
            subtitle={documentLabels.drivingLicense.subtitle}
            helper={documentLabels.drivingLicense.helper}
            imageUri={uploads.drivingLicense}
            onPress={() => chooseUpload('drivingLicense')}
          />

          {!isEV ? (
            <UploadCard
              title={documentLabels.rcBook.title}
              subtitle={documentLabels.rcBook.subtitle}
              helper={documentLabels.rcBook.helper}
              imageUri={uploads.rcBook}
              onPress={() => chooseUpload('rcBook')}
            />
          ) : (
            <View style={styles.evExemptCard}>
              <MaterialCommunityIcons name="lightning-bolt-circle" size={20} color="#22c55e" />
              <Text style={styles.evExemptText}>RC Book not required for Electric Bike partners.</Text>
            </View>
          )}

          <PartnerInput
            label="Insurance number"
            icon="shield-star-outline"
            value={form.insuranceNumber}
            onChangeText={(value) => updateField('insuranceNumber', normalizeInsuranceNumber(value))}
            placeholder="Optional policy number"
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="done"
            maxLength={30}
            helperText={insuranceHelperText}
            rightSlot={renderValidationIcon(Boolean(insuranceValue), insuranceValid)}
          />
          <UploadCard
            title={documentLabels.insurance.title}
            subtitle={documentLabels.insurance.subtitle}
            helper={documentLabels.insurance.helper}
            imageUri={uploads.insurance}
            onPress={() => chooseUpload('insurance')}
            optional
          />

          <View style={styles.buttonRow}>
            <PartnerButton
              label="Back"
              variant="secondary"
              icon="arrow-left"
              style={styles.rowButton}
              onPress={() => setCurrentStep(2)}
            />
            <PartnerButton
              label="Submit application"
              icon="check-circle-outline"
              loading={submitting}
              style={styles.rowButton}
              onPress={submitRegistration}
            />
          </View>
        </View>
      ) : null}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  sectionStack: {
    gap: 16,
    paddingBottom: 8,
  },
  verifyCard: {
    borderRadius: partnerTheme.radius.md,
    backgroundColor: '#F8FBF8',
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  verifyText: {
    flex: 1,
    color: partnerTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  lockedPhoneCard: {
    borderRadius: partnerTheme.radius.md,
    backgroundColor: '#EFF8F4',
    padding: 16,
    borderWidth: 1,
    borderColor: partnerTheme.colors.borderStrong,
  },
  lockedPhoneLabel: {
    color: partnerTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lockedPhoneValue: {
    color: partnerTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },
  vehicleStack: {
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  rowButton: {
    flex: 1,
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
  evNotice: {
    borderRadius: partnerTheme.radius.md,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  evNoticeText: {
    flex: 1,
    color: '#15803D',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  evExemptCard: {
    borderRadius: partnerTheme.radius.md,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  evExemptText: {
    flex: 1,
    color: '#15803D',
    fontSize: 13,
    fontWeight: '600',
  },
});
