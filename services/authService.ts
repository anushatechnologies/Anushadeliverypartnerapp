import type { CheckPhoneResponse, DeliveryAuthResponse } from '@/types/partner';
import { apiClient } from './apiClient';
import { getDeliveryAccessToken } from './sessionService';

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
  /**
   * GET /api/delivery/auth/check-phone/{phoneNumber}
   * Public — check if a phone number is already registered.
   * Phone must be URL-encoded E.164 format (e.g. %2B919948598350).
   */
  checkPhone: async (phoneNumber: string): Promise<CheckPhoneResponse> => {
    const res = await apiClient.get(
      `/api/delivery/auth/check-phone/${encodeURIComponent(phoneNumber)}`,
    );
    return res.data as CheckPhoneResponse;
  },

  /**
   * POST /api/delivery/auth/upload-profile-photo
   * Public — upload profile photo before signup.
   * Returns { success, photoUrl, message }.
   */
  uploadProfilePhoto: async (fileUri: string) => {
    const token = await getDeliveryAccessToken();

    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'profile.jpg';
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: 'image/jpeg',
    } as any);

    // Bypass Axios for multipart because Android Axios drops FormData boundaries
    const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.anushatechnologies.com';
    const init: RequestInit = {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const response = await fetch(`${BASE_URL}/api/delivery/auth/upload-profile-photo`, init);
    const data = await response.json();

    if (!response.ok) {
       console.warn('[PHOTO UPLOAD ERROR]', data);
       throw new Error(data?.message || 'Upload failed');
    }

    console.log('[PHOTO UPLOAD] Response', data);
    return data as { success?: boolean; photoUrl: string; message?: string };
  },

  /**
   * POST /api/delivery/auth/signup
   * Public — register a new delivery partner.
   * Returns full DeliveryAuthResponse including jwtToken and deliveryPersonId.
   */
  signup: async (data: SignupPayload): Promise<DeliveryAuthResponse> => {
    const payload = { ...data };
    if (!payload.fcmToken) delete payload.fcmToken;
    const res = await apiClient.post('/api/delivery/auth/signup', payload);
    return res.data as DeliveryAuthResponse;
  },

  /**
   * POST /api/delivery/auth/login
   * Public — login with Firebase ID token.
   * Returns full DeliveryAuthResponse including jwtToken and approvalStatus.
   *
   * IMPORTANT: Login succeeding does NOT mean the account is approved.
   * Always read approvalStatus / isApprovedByAdmin / onboardingStatus.canGoOnline.
   */
  login: async (firebaseIdToken: string, fcmToken?: string): Promise<DeliveryAuthResponse> => {
    const payload: { firebaseIdToken: string; fcmToken?: string } = { firebaseIdToken };
    if (fcmToken) payload.fcmToken = fcmToken;
    const res = await apiClient.post('/api/delivery/auth/login', payload);
    return res.data as DeliveryAuthResponse;
  },

  /**
   * POST /api/delivery/auth/refresh
   * Public — refresh accessToken using a valid refreshToken.
   */
  refresh: async (refreshToken: string) => {
    const res = await apiClient.post('/api/delivery/auth/refresh', { refreshToken });
    return res.data as { 
      accessToken: string; 
      refreshToken: string; 
      jwtToken?: string; 
      token?: string; 
      expiresIn: number; 
    };
  },

  /**
   * POST /api/delivery/auth/logout
   * Public — revoke the refreshToken on the server.
   */
  logout: async (refreshToken: string) => {
    const res = await apiClient.post('/api/delivery/auth/logout', { refreshToken });
    return res.data;
  },

  /**
   * POST /api/save-token
   * Public — save or refresh an FCM device token so the backend can push notifications.
   */
  saveFcmToken: async (phone: string, fcmToken: string): Promise<void> => {
    try {
      await apiClient.post('/api/save-token', { phone, fcmToken });
    } catch (error) {
      console.warn('[FCM] Token sync failed', error);
    }
  },

  /**
   * GET /api/delivery/auth/fare-rules
   * Public — get the current delivery fare rules.
   */
  getFareRules: async () => {
    const res = await apiClient.get('/api/delivery/auth/fare-rules');
    return res.data;
  },

  /**
   * POST /api/delivery/auth/fare/calculate
   * Public — calculate fare estimate for a trip.
   */
  calculateFare: async (vehicleType: string, distanceKm: number) => {
    const res = await apiClient.post('/api/delivery/auth/fare/calculate', { vehicleType, distanceKm });
    return res.data;
  },
};
