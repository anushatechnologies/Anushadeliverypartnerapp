import { apiClient } from './apiClient';

export const authService = {
  checkPhone: async (phoneNumber: string) => {
    const res = await apiClient.get(`/api/delivery/auth/check-phone/${encodeURIComponent(phoneNumber)}`);
    return res.data;
  },
  signup: async (data: { firebaseIdToken: string, firstName: string, lastName: string, vehicleType: string, vehicleModel: string, registrationNumber: string, profilePhotoUrl: string, fcmToken?: string }) => {
    const payload = { ...data };
    if (!payload.fcmToken) delete payload.fcmToken;
    const res = await apiClient.post('/api/delivery/auth/signup', payload);
    return res.data;
  },
  login: async (firebaseIdToken: string, fcmToken?: string) => {
    const payload: any = { firebaseIdToken };
    if (fcmToken) payload.fcmToken = fcmToken;
    const res = await apiClient.post('/api/delivery/auth/login', payload);
    return res.data;
  },
  saveFcmToken: async (phone: string, fcmToken: string) => {
    try {
      await apiClient.post('/api/save-token', { phone, fcmToken });
    } catch(e) {
      console.warn("FCM token save failed (non critical)", e);
    }
  }
};
