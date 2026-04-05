import { apiClient } from './apiClient';

export const payoutService = {
  /**
   * GET /api/delivery-app/payouts — JWT-based: Get logged-in user's payouts
   * This is the primary endpoint for the app (auto-identifies user from JWT).
   */
  getMyPayouts: async () => {
    const res = await apiClient.get('/api/delivery-app/payouts');
    return res.data;
  },

  // ─── ID-based fallback endpoints (admin/alternative) ────────────────────────

  /** GET payouts for a specific delivery person by ID */
  getPayouts: async (deliveryPersonId: number) => {
    const res = await apiClient.get(`/api/payouts/delivery-person/${deliveryPersonId}`);
    return res.data;
  },

  /** GET recent payouts for a specific delivery person by ID */
  getRecentPayouts: async (deliveryPersonId: number, limit: number = 5) => {
    const res = await apiClient.get(`/api/payouts/delivery-person/${deliveryPersonId}/recent?limit=${limit}`);
    return res.data;
  },

  /** GET total paid amount for a specific delivery person by ID */
  getTotalPaid: async (deliveryPersonId: number) => {
    const res = await apiClient.get(`/api/payouts/delivery-person/${deliveryPersonId}/total-paid`);
    return res.data;
  }
};
