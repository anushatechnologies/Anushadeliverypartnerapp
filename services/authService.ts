import type { DeliveryAuthResponse } from '@/types/partner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { apiClient } from './apiClient';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.anushatechnologies.com';

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
    const token = await AsyncStorage.getItem('@anusha_jwt_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    console.log('[PHOTO UPLOAD] Starting upload via FileSystem.uploadAsync', { fileUri });

    const result = await FileSystem.uploadAsync(
      `${BASE_URL}/api/delivery/auth/upload-profile-photo`,
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: 'image/jpeg',
        headers,
      },
    );

    console.log('[PHOTO UPLOAD] Response', { status: result.status, body: result.body });

    if (result.status < 200 || result.status >= 300) {
      const msg = (() => {
        try {
          return JSON.parse(result.body)?.message;
        } catch {
          return result.body;
        }
      })();
      throw new Error(msg || `Upload failed with status ${result.status}`);
    }

    return JSON.parse(result.body) as { success?: boolean; photoUrl: string; message?: string };
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
