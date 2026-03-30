import { apiClient } from './apiClient';

export const profileService = {
  // ─── JWT-based (delivery-app) endpoints ────────────────────────────────────

  /** Gets the current logged-in delivery person's status and profile using JWT */
  getStatus: async () => {
    const res = await apiClient.get('/delivery-app/api/status');
    return res.data;
  },

  updateOnlineStatus: async (isOnline: boolean) => {
    const res = await apiClient.put('/delivery-app/api/online-status', { isOnline });
    return res.data;
  },

  updateProfileDetails: async (data: { firstName: string; lastName: string; profilePhotoUrl?: string }) => {
    const res = await apiClient.put('/delivery-app/api/profile', data);
    return res.data;
  },

  updateProfilePhoto: async (fileUri: string) => {
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;
    formData.append('file', { uri: fileUri, name: filename, type } as any);
    const res = await apiClient.post('/delivery-app/api/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  updateVehicle: async (data: { vehicleType: string; vehicleModel: string; registrationNumber: string }) => {
    const res = await apiClient.put('/delivery-app/api/vehicle', data);
    return res.data;
  },

  getDeliveryPersonByPhone: async (phoneNumber: string) => {
    const res = await apiClient.get(`/delivery-app/api/phone/${encodeURIComponent(phoneNumber)}`);
    return res.data;
  },

  /** GET /delivery-app/api/dashboard — JWT-based dashboard */
  getDashboard: async () => {
    const res = await apiClient.get('/delivery-app/api/dashboard');
    return res.data;
  },

  // ─── ID-based endpoints (/api/delivery-person/{id}) ────────────────────────

  /** GET /api/delivery-person/{id} */
  getDeliveryPersonById: async (id: number) => {
    const res = await apiClient.get(`/api/delivery-person/${id}`);
    return res.data;
  },

  /** PUT /api/delivery-person/{id}/vehicle */
  updateVehicleById: async (
    id: number,
    data: { vehicleType: string; vehicleModel: string; registrationNumber: string }
  ) => {
    const res = await apiClient.put(`/api/delivery-person/${id}/vehicle`, data);
    return res.data;
  },

  /** GET /api/delivery-person/{id}/documents */
  getDocumentsById: async (id: number) => {
    const res = await apiClient.get(`/api/delivery-person/${id}/documents`);
    return res.data;
  },

  /** PUT /api/delivery-person/{id}/online-status */
  updateOnlineStatusById: async (id: number, isOnline: boolean) => {
    const res = await apiClient.put(`/api/delivery-person/${id}/online-status`, { isOnline });
    return res.data;
  },

  /** GET /api/delivery-person/{id}/dashboard */
  getDashboardById: async (id: number) => {
    const res = await apiClient.get(`/api/delivery-person/${id}/dashboard`);
    return res.data;
  },
};
