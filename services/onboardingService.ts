import messaging from '@react-native-firebase/messaging';
import { authService } from './authService';
import { documentService } from './documentService';
import { saveDeliveryTokens } from './sessionService';
import type {
  DeliveryAuthResponse,
  RegistrationDocumentKey,
  RegistrationFormValues,
  RegistrationUploads,
  VehicleType,
} from '@/types/partner';
import { getRequiredDocumentKeys } from '@/constants/partnerOnboarding';
import {
  sanitizeAadhaar,
} from '@/utils/partnerFormatters';

interface CompleteRegistrationInput {
  firebaseIdToken: string;
  form: RegistrationFormValues;
  uploads: RegistrationUploads;
}

export const onboardingService = {
  async completeRegistration({
    firebaseIdToken,
    form,
    uploads,
  }: CompleteRegistrationInput): Promise<DeliveryAuthResponse> {
    if (!uploads.profilePhoto) {
      throw new Error('Profile photo is required before signup.');
    }

    const isEV = form.vehicleType === 'EV';

    const fcmPermission = await messaging().requestPermission().catch(() => null);
    const canUseFcm =
      fcmPermission === messaging.AuthorizationStatus.AUTHORIZED ||
      fcmPermission === messaging.AuthorizationStatus.PROVISIONAL;
    const fcmToken = canUseFcm ? await messaging().getToken().catch(() => '') : '';

    const profileUpload = await authService.uploadProfilePhoto(uploads.profilePhoto);

    // EV doesn't have a registration number — send a placeholder
    const registrationNumber = isEV ? 'EV-EXEMPT' : form.registrationNumber.trim();

    const signupRes = await authService.signup({
      firebaseIdToken,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      vehicleType: form.vehicleType,
      vehicleModel: form.vehicleModel.trim(),
      registrationNumber,
      profilePhotoUrl: profileUpload.photoUrl,
      fcmToken: fcmToken || undefined,
    });

    const accessToken = signupRes.accessToken || signupRes.jwtToken || signupRes.token || null;
    if (!accessToken) {
      throw new Error('Signup succeeded but JWT token was missing, so document upload could not start.');
    }

    await saveDeliveryTokens(accessToken, signupRes.refreshToken);

    const deliveryPersonId = signupRes.deliveryPersonId;
    const uploadJobs: {
      key: RegistrationDocumentKey;
      documentType: string;
      documentNumber: string | null;
      fileUri: string;
    }[] = [];

    if (uploads.aadhaarFront) {
      uploadJobs.push({
        key: 'aadhaarFront',
        documentType: 'AADHAAR_FRONT',
        documentNumber: sanitizeAadhaar(form.aadhaarNumber),
        fileUri: uploads.aadhaarFront,
      });
    }

    if (uploads.aadhaarBack) {
      uploadJobs.push({
        key: 'aadhaarBack',
        documentType: 'AADHAAR_BACK',
        documentNumber: sanitizeAadhaar(form.aadhaarNumber),
        fileUri: uploads.aadhaarBack,
      });
    }

    if (uploads.panCard) {
      uploadJobs.push({
        key: 'panCard',
        documentType: 'PAN_CARD',
        documentNumber: form.panNumber.trim(),
        fileUri: uploads.panCard,
      });
    }

    if (uploads.drivingLicense) {
      uploadJobs.push({
        key: 'drivingLicense',
        documentType: 'DRIVING_LICENSE',
        documentNumber: form.drivingLicenseNumber.trim(),
        fileUri: uploads.drivingLicense,
      });
    }

    // RC Book: skip entirely for EV — not required
    if (!isEV && uploads.rcBook) {
      uploadJobs.push({
        key: 'rcBook',
        documentType: 'RC_BOOK',
        documentNumber: form.registrationNumber.trim(),
        fileUri: uploads.rcBook,
      });
    }

    // Insurance: optional for all vehicle types
    if (uploads.insurance) {
      uploadJobs.push({
        key: 'insurance',
        documentType: 'INSURANCE',
        documentNumber: form.insuranceNumber.trim() || null,
        fileUri: uploads.insurance,
      });
    }

    console.log('[ONBOARDING] Signup completed, starting document uploads', {
      deliveryPersonId,
      vehicleType: form.vehicleType,
      isEV,
      uploadCount: uploadJobs.length,
      hasJwtToken: Boolean(accessToken),
    });

    for (const job of uploadJobs) {
      try {
        console.log('[ONBOARDING] Uploading document', {
          deliveryPersonId,
          documentType: job.documentType,
          key: job.key,
          fileUri: job.fileUri,
        });

        await documentService.uploadDocument(
          deliveryPersonId,
          job.documentType,
          job.documentNumber,
          job.fileUri,
          accessToken,
        );
      } catch (error: any) {
        const reason =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Unknown upload failure';

        console.warn('[ONBOARDING] Document upload failed', {
          deliveryPersonId,
          documentType: job.documentType,
          key: job.key,
          reason,
          status: error?.response?.status,
          response: error?.response?.data,
        });

        throw new Error(`${job.documentType} upload failed: ${reason}`);
      }
    }

    return {
      ...signupRes,
      profilePhotoUrl: signupRes.profilePhotoUrl || profileUpload.photoUrl,
    };
  },

  /**
   * Check whether all required uploads are present.
   * EV partners don't need rcBook — uses vehicle-type-aware required keys.
   */
  hasRequiredUploads(uploads: RegistrationUploads, vehicleType: VehicleType = 'BIKE') {
    const required = getRequiredDocumentKeys(vehicleType);
    return required.every((key) => Boolean(uploads[key]));
  },
};
