import type { DeliveryAuthResponse } from '@/types/partner';
import { buildImageFilePart } from '@/utils/multipart';
import { apiClient } from './apiClient';

interface SignupPayload {
  firebaseIdToken: string;
  firstName: string;
  lastName: string;
  vehicleType: string;
  vehicleModel: string;
  registrationNumber: string;
  profilePhotoUrl: string;
  fcmToken?: string;
}

export const authService = {
  checkPhone: async (phoneNumber: string) => {
    const res = await apiClient.get(
      `/api/delivery/auth/check-phone/${encodeURIComponent(phoneNumber)}`,
    );
    return res.data as { exists?: boolean; registered?: boolean; message?: string };
  },

  uploadProfilePhoto: async (fileUri: string) => {
    const formData = new FormData();
    formData.append('file', buildImageFilePart(fileUri, 'partner-profile.jpg'));
    // No Content-Type header — interceptor removes it so RN sets correct multipart boundary
    const res = await apiClient.post('/api/delivery/auth/upload-profile-photo', formData, {
      timeout: 120000, // 2 min for photo upload
    });
    return res.data as { success?: boolean; photoUrl: string; message?: string };
  },

  signup: async (data: SignupPayload) => {
    const payload = { ...data };
    if (!payload.fcmToken) delete payload.fcmToken;
    const res = await apiClient.post('/api/delivery/auth/signup', payload);
    return res.data as DeliveryAuthResponse;
  },

  login: async (firebaseIdToken: string, fcmToken?: string) => {
    const payload: { firebaseIdToken: string; fcmToken?: string } = { firebaseIdToken };
    if (fcmToken) payload.fcmToken = fcmToken;
    const res = await apiClient.post('/api/delivery/auth/login', payload);
    return res.data as DeliveryAuthResponse;
  },

  saveFcmToken: async (phone: string, fcmToken: string) => {
    try {
      await apiClient.post('/api/save-token', { phone, fcmToken });
    } catch (error) {
      console.warn('FCM token sync failed', error);
    }
  },
};
