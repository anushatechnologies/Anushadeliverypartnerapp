import { apiClient } from './apiClient';

export const profileService = {
  // ─── JWT-based (delivery-app) endpoints ────────────────────────────────────
  // These automatically identify the Delivery Person from their JWT token.

  /** GET /api/delivery-app/status — Returns completion status, profile stats, and document status */
  getStatus: async () => {
    const res = await apiClient.get('/api/delivery-app/status');
    return res.data;
  },

  /** PUT /api/delivery-app/online-status — Toggle online/offline */
  updateOnlineStatus: async (isOnline: boolean) => {
    const res = await apiClient.put('/api/delivery-app/online-status', { isOnline });
    return res.data;
  },

  /** PUT /api/delivery-app/profile — Update name and profile photo URL */
  updateProfileDetails: async (data: { firstName: string; lastName: string; profilePhotoUrl?: string }) => {
    const res = await apiClient.put('/api/delivery-app/profile', data);
    return res.data;
  },

  /** POST /api/delivery-app/profile-photo — Upload profile photo (multipart/form-data) */
  updateProfilePhoto: async (fileUri: string) => {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;
    formData.append('file', { uri: fileUri, name: filename, type } as any);
    const res = await apiClient.post('/api/delivery-app/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /** PUT /api/delivery-app/vehicle — Update vehicle information */
  updateVehicle: async (data: { vehicleType: string; vehicleModel: string; registrationNumber: string }) => {
    const res = await apiClient.put('/api/delivery-app/vehicle', data);
    return res.data;
  },

  /** PUT /api/delivery-app/bank-details — Update bank account details */
  updateBankDetails: async (data: { accountName: string; accountNumber: string; bankName: string; ifscCode: string }) => {
    const res = await apiClient.put('/api/delivery-app/bank-details', data);
    return res.data;
  },

  /** GET /api/delivery-app/dashboard — Returns total earnings, weekly earnings, completed orders */
  getDashboard: async () => {
    const res = await apiClient.get('/api/delivery-app/dashboard');
    return res.data;
  },

  /** GET /api/delivery-app/payouts — Get logged-in user's payout history (JWT-based) */
  getMyPayouts: async () => {
    const res = await apiClient.get('/api/delivery-app/payouts');
    return res.data;
  },

  /** GET /api/delivery-app/phone/{phoneNumber} — Public/Admin: get delivery person by phone */
  getDeliveryPersonByPhone: async (phoneNumber: string) => {
    const res = await apiClient.get(`/api/delivery-app/phone/${encodeURIComponent(phoneNumber)}`);
    return res.data;
  },

  // ─── ID-based endpoints (/api/delivery-person/{id}) ────────────────────────
  // Alternative endpoints that bypass JWT auto-extraction (admin/fallback use).

  /** GET /api/delivery-person/{id} — Complete profile info including documents and approval status */
  getDeliveryPersonById: async (id: number) => {
    const res = await apiClient.get(`/api/delivery-person/${id}`);
    return res.data;
  },

  /** GET /api/delivery-person/{id}/documents — Fetch all uploaded KYC documents */
  getDocumentsById: async (id: number) => {
    const res = await apiClient.get(`/api/delivery-person/${id}/documents`);
    return res.data;
  },

  /** GET /api/delivery-person/{id}/dashboard — Dashboard stats by profile ID */
  getDashboardById: async (id: number) => {
    const res = await apiClient.get(`/api/delivery-person/${id}/dashboard`);
    return res.data;
  },

  /** PUT /api/delivery-person/{id}/online-status — Update online status by ID */
  updateOnlineStatusById: async (id: number, isOnline: boolean) => {
    const res = await apiClient.put(`/api/delivery-person/${id}/online-status`, { isOnline });
    return res.data;
  },

  /** PUT /api/delivery-person/{id}/vehicle — Update vehicle mapped to ID */
  updateVehicleById: async (
    id: number,
    data: { vehicleType: string; vehicleModel: string; registrationNumber: string }
  ) => {
    const res = await apiClient.put(`/api/delivery-person/${id}/vehicle`, data);
    return res.data;
  },

};
