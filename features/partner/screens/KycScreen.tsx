import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { PartnerButton } from '@/components/auth/PartnerButton';
import { PartnerInput } from '@/components/auth/PartnerInput';
import { UploadCard } from '@/components/auth/UploadCard';
import { documentLabels } from '@/constants/partnerOnboarding';
import { partnerTheme } from '@/constants/partnerTheme';
import { useUser } from '@/context/UserContext';
import { documentService } from '@/services/documentService';
import { profileService } from '@/services/profileService';
import {
  formatAadhaar,
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
} from '@/utils/partnerFormatters';

type KycUploadKey = 'aadhaarFront' | 'aadhaarBack' | 'panCard' | 'drivingLicense' | 'rcBook' | 'insurance';

const documentConfigs: Array<{
  key: KycUploadKey;
  backendType: string;
  numberField: 'aadhaarNumber' | 'panNumber' | 'drivingLicenseNumber' | 'rcNumber' | 'insuranceNumber';
}> = [
  { key: 'aadhaarFront', backendType: 'AADHAAR_FRONT', numberField: 'aadhaarNumber' },
  { key: 'aadhaarBack', backendType: 'AADHAAR_BACK', numberField: 'aadhaarNumber' },
  { key: 'panCard', backendType: 'PAN_CARD', numberField: 'panNumber' },
  { key: 'drivingLicense', backendType: 'DRIVING_LICENSE', numberField: 'drivingLicenseNumber' },
  { key: 'rcBook', backendType: 'RC_BOOK', numberField: 'rcNumber' },
  { key: 'insurance', backendType: 'INSURANCE', numberField: 'insuranceNumber' },
];

export default function KycScreen() {
  const router = useRouter();
  const { authState } = useUser();
  const [deliveryPersonId, setDeliveryPersonId] = useState<number | null>(authState.user?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploads, setUploads] = useState<Record<KycUploadKey, string | null>>({
    aadhaarFront: null,
    aadhaarBack: null,
    panCard: null,
    drivingLicense: null,
    rcBook: null,
    insurance: null,
  });
  const [numbers, setNumbers] = useState({
    aadhaarNumber: '',
    panNumber: '',
    drivingLicenseNumber: '',
    rcNumber: '',
    insuranceNumber: '',
  });
  const [documentsByType, setDocumentsByType] = useState<Record<string, any>>({});

  const currentStatus = useMemo(() => {
    return documentConfigs.reduce<Record<string, string>>((acc, config) => {
      acc[config.key] = String(documentsByType[config.backendType]?.status || 'NOT_UPLOADED');
      return acc;
    }, {});
  }, [documentsByType]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await profileService.getStatus();
      const nextDeliveryPersonId = response?.deliveryPerson?.id || authState.user?.id || null;
      setDeliveryPersonId(nextDeliveryPersonId);

      const mapped: Record<string, any> = {};
      const docs = Array.isArray(response?.documents) ? response.documents : [];
      docs.forEach((document: any) => {
        mapped[document.documentType] = document;
      });
      setDocumentsByType(mapped);

      setNumbers((current) => ({
        aadhaarNumber:
          current.aadhaarNumber ||
          mapped.AADHAAR_FRONT?.documentNumber ||
          mapped.AADHAAR_BACK?.documentNumber ||
          mapped.AADHAAR_CARD?.documentNumber ||
          '',
        panNumber: current.panNumber || mapped.PAN_CARD?.documentNumber || '',
        drivingLicenseNumber: current.drivingLicenseNumber || mapped.DRIVING_LICENSE?.documentNumber || '',
        rcNumber: current.rcNumber || mapped.RC_BOOK?.documentNumber || '',
        insuranceNumber: current.insuranceNumber || mapped.INSURANCE?.documentNumber || '',
      }));
    } catch (error) {
      console.warn('KYC status fetch failed', error);
    } finally {
      setLoading(false);
    }
  };

  const setNumber = (field: keyof typeof numbers, value: string) => {
    setNumbers((current) => ({ ...current, [field]: value }));
  };

  const chooseUpload = (key: KycUploadKey) => {
    const status = currentStatus[key];
    if (status === 'APPROVED' || status === 'PENDING') {
      Alert.alert('Locked document', 'This document is already submitted or approved and cannot be changed right now.');
      return;
    }

    Alert.alert('Upload document', 'Choose how you want to add this file.', [
      { text: 'Camera', onPress: () => pickImage(key, 'camera') },
      { text: 'Device files', onPress: () => pickImage(key, 'library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async (key: KycUploadKey, source: 'camera' | 'library') => {
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
        setUploads((current) => ({ ...current, [key]: result.assets[0].uri }));
      }
    } catch (error: any) {
      Alert.alert('Upload cancelled', error?.message || 'We could not access that file right now.');
    }
  };

  const validateBeforeSubmit = () => {
    if (uploads.aadhaarFront || uploads.aadhaarBack) {
      if (!isValidAadhaar(sanitizeAadhaar(numbers.aadhaarNumber))) {
        Alert.alert('Invalid Aadhaar', 'Aadhaar number must contain exactly 12 digits.');
        return false;
      }
    }

    if (uploads.panCard && !isValidPan(numbers.panNumber)) {
      Alert.alert('Invalid PAN', 'PAN number should match the format ABCDE1234F.');
      return false;
    }

    if (uploads.drivingLicense && !isValidLicense(numbers.drivingLicenseNumber)) {
      Alert.alert('Invalid license', 'Please enter a valid driving license number.');
      return false;
    }

    if (uploads.rcBook && !isValidRcNumber(numbers.rcNumber)) {
      Alert.alert('Invalid RC number', 'Please enter a valid registration or RC number.');
      return false;
    }

    if (uploads.insurance && !isValidInsuranceNumber(numbers.insuranceNumber)) {
      Alert.alert('Invalid insurance number', 'Please enter the policy number for the uploaded insurance document.');
      return false;
    }

    return true;
  };

  const submitUpdates = async () => {
    if (!deliveryPersonId) {
      Alert.alert('Account not ready', 'We could not identify your partner profile right now.');
      return;
    }

    const pendingUploads = documentConfigs.filter((config) => Boolean(uploads[config.key]));
    if (pendingUploads.length === 0) {
      Alert.alert('Nothing to upload', 'Choose at least one document to upload or reupload.');
      return;
    }

    if (!validateBeforeSubmit()) {
      return;
    }

    setSubmitting(true);
    try {
      const results = await Promise.allSettled(
        pendingUploads.map((config) =>
          documentService.uploadDocument(
            deliveryPersonId,
            config.backendType,
            numbers[config.numberField] || null,
            uploads[config.key]!,
          ),
        ),
      );

      const failures = results.filter((result) => result.status === 'rejected');
      if (failures.length > 0) {
        throw new Error('One or more documents failed to upload.');
      }

      Alert.alert('Documents submitted', 'Your updated documents were sent to the admin review queue.');
      setUploads({
        aadhaarFront: null,
        aadhaarBack: null,
        panCard: null,
        drivingLicense: null,
        rcBook: null,
        insurance: null,
      });
      await loadStatus();
    } catch (error: any) {
      Alert.alert(
        'Upload failed',
        error?.response?.data?.message || error?.message || 'Could not upload the selected documents.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="KYC"
      title="Manage verification documents"
      subtitle="Review document status, reupload rejected files, and keep your partner profile aligned with the backend review flow."
      onBackPress={() => router.back()}
    >
      <View style={styles.stack}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Current review status</Text>
          <Text style={styles.infoText}>
            Approved or pending documents stay locked. Rejected or missing items can be uploaded again from here.
          </Text>
        </View>

        <PartnerInput
          label="Aadhaar number"
          icon="card-account-details-outline"
          keyboardType="number-pad"
          value={formatAadhaar(numbers.aadhaarNumber)}
          onChangeText={(value) => setNumber('aadhaarNumber', sanitizeAadhaar(value))}
          placeholder="XXXX XXXX XXXX"
        />
        <DocumentBlock
          title={documentLabels.aadhaarFront.title}
          subtitle={documentLabels.aadhaarFront.subtitle}
          helper={documentLabels.aadhaarFront.helper}
          imageUri={uploads.aadhaarFront || documentsByType.AADHAAR_FRONT?.documentUrl || documentsByType.AADHAAR_CARD?.documentUrl || null}
          status={currentStatus.aadhaarFront}
          onPress={() => chooseUpload('aadhaarFront')}
        />
        <DocumentBlock
          title={documentLabels.aadhaarBack.title}
          subtitle={documentLabels.aadhaarBack.subtitle}
          helper={documentLabels.aadhaarBack.helper}
          imageUri={uploads.aadhaarBack || documentsByType.AADHAAR_BACK?.documentUrl || documentsByType.AADHAAR_CARD?.documentUrl || null}
          status={currentStatus.aadhaarBack}
          onPress={() => chooseUpload('aadhaarBack')}
        />

        <PartnerInput
          label="PAN number"
          icon="card-bulleted-outline"
          value={numbers.panNumber}
          onChangeText={(value) => setNumber('panNumber', normalizePan(value))}
          placeholder="ABCDE1234F"
          autoCapitalize="characters"
        />
        <DocumentBlock
          title={documentLabels.panCard.title}
          subtitle={documentLabels.panCard.subtitle}
          helper={documentLabels.panCard.helper}
          imageUri={uploads.panCard || documentsByType.PAN_CARD?.documentUrl || null}
          status={currentStatus.panCard}
          onPress={() => chooseUpload('panCard')}
        />

        <PartnerInput
          label="Driving license"
          icon="card-account-phone-outline"
          value={numbers.drivingLicenseNumber}
          onChangeText={(value) => setNumber('drivingLicenseNumber', normalizeLicense(value))}
          placeholder="AP0320260001234"
          autoCapitalize="characters"
        />
        <DocumentBlock
          title={documentLabels.drivingLicense.title}
          subtitle={documentLabels.drivingLicense.subtitle}
          helper={documentLabels.drivingLicense.helper}
          imageUri={uploads.drivingLicense || documentsByType.DRIVING_LICENSE?.documentUrl || null}
          status={currentStatus.drivingLicense}
          onPress={() => chooseUpload('drivingLicense')}
        />

        <PartnerInput
          label="RC number"
          icon="card-text-outline"
          value={numbers.rcNumber}
          onChangeText={(value) => setNumber('rcNumber', normalizeRcNumber(value))}
          placeholder="AP39XY1234"
          autoCapitalize="characters"
        />
        <DocumentBlock
          title={documentLabels.rcBook.title}
          subtitle={documentLabels.rcBook.subtitle}
          helper={documentLabels.rcBook.helper}
          imageUri={uploads.rcBook || documentsByType.RC_BOOK?.documentUrl || null}
          status={currentStatus.rcBook}
          onPress={() => chooseUpload('rcBook')}
        />

        <PartnerInput
          label="Insurance number"
          icon="shield-check-outline"
          value={numbers.insuranceNumber}
          onChangeText={(value) => setNumber('insuranceNumber', normalizeInsuranceNumber(value))}
          placeholder="Optional policy number"
          autoCapitalize="characters"
          helperText="Optional. Upload it now if you want the admin team to review it early."
        />
        <DocumentBlock
          title={documentLabels.insurance.title}
          subtitle={documentLabels.insurance.subtitle}
          helper={documentLabels.insurance.helper}
          imageUri={uploads.insurance || documentsByType.INSURANCE?.documentUrl || null}
          status={currentStatus.insurance}
          optional
          onPress={() => chooseUpload('insurance')}
        />

        <PartnerButton
          label={submitting ? 'Uploading...' : 'Submit document updates'}
          icon="cloud-upload-outline"
          loading={submitting}
          disabled={loading}
          onPress={submitUpdates}
        />
      </View>
    </AuthScaffold>
  );
}

function DocumentBlock({
  title,
  subtitle,
  helper,
  imageUri,
  status,
  optional,
  onPress,
}: {
  title: string;
  subtitle: string;
  helper: string;
  imageUri: string | null;
  status: string;
  optional?: boolean;
  onPress: () => void;
}) {
  const chip = status === 'APPROVED'
    ? { label: 'Approved', backgroundColor: '#E8F8EC', color: '#15803D' }
    : status === 'PENDING'
      ? { label: 'Pending', backgroundColor: '#FFF5D8', color: '#B45309' }
      : status === 'REJECTED' || status === 'NEEDS_REUPLOAD'
        ? { label: 'Reupload', backgroundColor: '#FFF0F0', color: '#B91C1C' }
        : { label: optional ? 'Optional' : 'Required', backgroundColor: '#EEF4EF', color: partnerTheme.colors.textMuted };

  return (
    <View style={styles.documentStack}>
      <View style={[styles.statusChip, { backgroundColor: chip.backgroundColor }]}> 
        <Text style={[styles.statusChipText, { color: chip.color }]}>{chip.label}</Text>
      </View>
      <UploadCard
        title={title}
        subtitle={subtitle}
        helper={helper}
        imageUri={imageUri}
        optional={optional}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  infoCard: {
    borderRadius: partnerTheme.radius.md,
    backgroundColor: '#F8FBF8',
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 16,
    gap: 6,
  },
  infoTitle: {
    color: partnerTheme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  infoText: {
    color: partnerTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  documentStack: {
    gap: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: partnerTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
