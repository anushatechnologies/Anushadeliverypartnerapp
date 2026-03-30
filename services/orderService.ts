import { apiClient } from './apiClient';

export const orderService = {
  // ─── List-based order queries ────────────────────────────────────────────────

  /** GET /api/delivery-orders/delivery-person/{id} */
  getOrders: async (deliveryPersonId: number) => {
    const res = await apiClient.get(`/api/delivery-orders/delivery-person/${deliveryPersonId}`);
    return res.data;
  },

  /** GET /api/delivery-orders/delivery-person/{id}/active */
  getActiveOrders: async (deliveryPersonId: number) => {
    const res = await apiClient.get(`/api/delivery-orders/delivery-person/${deliveryPersonId}/active`);
    return res.data;
  },

  /** GET /api/delivery-orders/delivery-person/{id}/completed */
  getCompletedOrders: async (deliveryPersonId: number) => {
    const res = await apiClient.get(`/api/delivery-orders/delivery-person/${deliveryPersonId}/completed`);
    return res.data;
  },

  /** GET /api/delivery-orders/delivery-person/{id}/recent?limit={n} */
  getRecentOrders: async (deliveryPersonId: number, limit: number = 5) => {
    const res = await apiClient.get(`/api/delivery-orders/delivery-person/${deliveryPersonId}/recent?limit=${limit}`);
    return res.data;
  },

  /** GET /api/delivery-orders/delivery-person/{id}/statistics */
  getStatistics: async (deliveryPersonId: number) => {
    const res = await apiClient.get(`/api/delivery-orders/delivery-person/${deliveryPersonId}/statistics`);
    return res.data;
  },

  // ─── Single-order lookup ─────────────────────────────────────────────────────

  /** GET /api/delivery-orders/{id} */
  getOrderById: async (id: number) => {
    const res = await apiClient.get(`/api/delivery-orders/${id}`);
    return res.data;
  },

  /** GET /api/delivery-orders/number/{orderNumber} */
  getOrderByNumber: async (orderNumber: string) => {
    const res = await apiClient.get(`/api/delivery-orders/number/${encodeURIComponent(orderNumber)}`);
    return res.data;
  },

  // ─── OTP & Fulfillment ───────────────────────────────────────────────────────

  /** POST /api/delivery-orders/verify-pickup-otp */
  verifyPickupOtp: async (orderNumber: string, otp: string) => {
    const res = await apiClient.post('/api/delivery-orders/verify-pickup-otp', { orderNumber, otp });
    return res.data;
  },

  /** POST /api/delivery-orders/confirm-pickup */
  confirmPickup: async (orderNumber: string, otp: string) => {
    const res = await apiClient.post('/api/delivery-orders/confirm-pickup', { orderNumber, otp });
    return res.data;
  },

  /** POST /api/delivery-orders/verify-delivery-otp */
  verifyDeliveryOtp: async (orderNumber: string, otp: string) => {
    const res = await apiClient.post('/api/delivery-orders/verify-delivery-otp', { orderNumber, otp });
    return res.data;
  },

  /** POST /api/delivery-orders/confirm-delivery */
  confirmDelivery: async (orderNumber: string, otp: string) => {
    const res = await apiClient.post('/api/delivery-orders/confirm-delivery', { orderNumber, otp });
    return res.data;
  },

  /** POST /api/delivery-orders/{orderNumber}/accept */
  acceptOrder: async (orderNumber: string) => {
    const res = await apiClient.post(`/api/delivery-orders/${encodeURIComponent(orderNumber)}/accept`);
    return res.data;
  },

  /** POST /api/delivery-orders/{orderNumber}/reject */
  rejectOrder: async (orderNumber: string) => {
    const res = await apiClient.post(`/api/delivery-orders/${encodeURIComponent(orderNumber)}/reject`);
    return res.data;
  },

  /** POST /api/delivery-orders/{orderNumber}/update-location */
  updateLocation: async (orderNumber: string, latitude: number, longitude: number) => {
    const res = await apiClient.post(`/api/delivery-orders/${encodeURIComponent(orderNumber)}/update-location`, { latitude, longitude });
    return res.data;
  },

  /** POST /api/delivery-orders/{orderId}/cancel */
  cancelOrder: async (orderId: number, reason: string) => {
    const res = await apiClient.post(`/api/delivery-orders/${orderId}/cancel`, { reason });
    return res.data;
  },

  // ─── Admin / System ──────────────────────────────────────────────────────────

  /**
   * POST /api/delivery-orders
   * Create a new delivery order (admin/system use).
   */
  createDeliveryOrder: async (data: {
    orderNumber: string;
    deliveryPersonId: number;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    [key: string]: any; // allow extra optional fields
  }) => {
    const res = await apiClient.post('/api/delivery-orders', data);
    return res.data;
  },
};
