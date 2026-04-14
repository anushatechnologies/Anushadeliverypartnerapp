import { apiClient } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const orderService = {
  // ─── PREFERRED: /api/delivery-app/orders/* ────────────────────────────────
  // These use the JWT bearer token to auto-identify the rider — no ID needed.

  /**
   * GET /api/delivery-app/available-orders
   * Returns currently broadcasted orders the rider can accept.
   */
  getAvailableOrders: async () => {
    const res = await apiClient.get('/api/delivery-app/available-orders');
    return res.data;
  },

  /**
   * POST /api/delivery-app/orders/{orderId}/accept
   * Accept an available order using its numeric ID (preferred route).
   */
  acceptOrderFromApp: async (orderId: number | string) => {
    const res = await apiClient.post(`/api/delivery-app/orders/${orderId}/accept`);
    return res.data;
  },

  /**
   * POST /api/delivery-app/orders/{orderId}/reject
   * Reject an available order using its numeric ID (preferred route).
   */
  rejectOrderFromApp: async (orderId: number | string, reason: string) => {
    // Some backends expect reason as a query param, some as a body. We send both.
    const res = await apiClient.post(`/api/delivery-app/orders/${orderId}/reject?reason=${encodeURIComponent(reason)}`, { reason });
    return res.data;
  },

  /**
   * POST /api/delivery-app/orders/{orderNumber}/arrived
   * Mark that the rider has arrived at the store/pickup location.
   */
  arrivedAtStore: async (orderNumber: string) => {
    const res = await apiClient.post(
      `/api/delivery-app/orders/${encodeURIComponent(orderNumber)}/arrived`,
    );
    return res.data;
  },

  /**
   * POST /api/delivery-app/orders/{orderNumber}/picked-up
   * Confirm pickup from the store using the store's pickup OTP.
   */
  pickedUpWithOtp: async (orderNumber: string, otp: string) => {
    const res = await apiClient.post(
      `/api/delivery-app/orders/${encodeURIComponent(orderNumber)}/picked-up`,
      { otp },
    );
    return res.data;
  },

  /**
   * POST /api/delivery-app/orders/{orderNumber}/generate-delivery-otp
   * Generates a customer-facing delivery OTP and sends it via SMS.
   * Returns { success, message, otp }.
   */
  generateDeliveryOtp: async (orderNumber: string) => {
    const res = await apiClient.post(
      `/api/delivery-app/orders/${encodeURIComponent(orderNumber)}/generate-delivery-otp`,
    );
    return res.data;
  },

  /**
   * POST /api/delivery-app/orders/{orderNumber}/confirm-delivery  (multipart)
   * Verifies customer OTP, optionally uploads a delivery photo, marks order DELIVERED.
   * This is the PREFERRED final delivery endpoint.
   */
  confirmDeliveryWithPhoto: async (orderNumber: string, otp: string, photoUri?: string) => {
    const formData = new FormData();
    formData.append('otp', otp);
    if (photoUri) {
      const filename = photoUri.split('/').pop() ?? 'delivery.jpg';
      formData.append('photo', { uri: photoUri, name: filename, type: 'image/jpeg' } as any);
    }
    
    const token = await AsyncStorage.getItem('@anusha_jwt_token');
    const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.anushatechnologies.com';
    const init: RequestInit = {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const response = await fetch(`${BASE_URL}/api/delivery-app/orders/${encodeURIComponent(orderNumber)}/confirm-delivery`, init);
    const data = await response.json();

    if (!response.ok) {
       throw new Error(data?.message || 'Failed to confirm delivery');
    }
    return data;
  },

  /**
   * POST /api/delivery-app/orders/{orderNumber}/delivered
   * Legacy shortcut: mark as delivered without photo proof.
   * Use confirmDeliveryWithPhoto instead when possible.
   */
  markDelivered: async (orderNumber: string) => {
    const res = await apiClient.post(
      `/api/delivery-app/orders/${encodeURIComponent(orderNumber)}/delivered`,
    );
    return res.data;
  },

  /**
   * POST /api/delivery-app/location — rider GPS ping (idle or active)
   * Called every 30 s by locationService.startTracking().
   */
  updateRiderLocation: async (lat: number, lng: number) => {
    const res = await apiClient.post('/api/delivery-app/location', { lat, lng });
    return res.data;
  },

  // ─── LEGACY: /api/delivery-orders/* ─────────────────────────────────────
  // Used for order lists, statistics, and OTP flows still in use.

  /** GET /api/delivery-orders/delivery-person/{id} — All orders */
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
    const res = await apiClient.get(
      `/api/delivery-orders/delivery-person/${deliveryPersonId}/recent?limit=${limit}`,
    );
    return res.data;
  },

  /** GET /api/delivery-orders/delivery-person/{id}/statistics */
  getStatistics: async (deliveryPersonId: number) => {
    const res = await apiClient.get(
      `/api/delivery-orders/delivery-person/${deliveryPersonId}/statistics`,
    );
    return res.data;
  },

  /** GET /api/delivery-orders/{id} — By numeric ID */
  getOrderById: async (id: number) => {
    const res = await apiClient.get(`/api/delivery-orders/${id}`);
    return res.data;
  },

  /** GET /api/delivery-orders/number/{orderNumber} — By order number string */
  getOrderByNumber: async (orderNumber: string) => {
    const res = await apiClient.get(`/api/delivery-orders/number/${encodeURIComponent(orderNumber)}`);
    return res.data;
  },

  /**
   * POST /api/delivery-orders/{orderNumber}/accept
   * Legacy accept — requires explicit deliveryPersonId in body.
   * Prefer acceptOrderFromApp() for JWT-based rider flows.
   */
  acceptOrder: async (orderNumber: string, deliveryPersonId: number) => {
    const res = await apiClient.post(
      `/api/delivery-orders/${encodeURIComponent(orderNumber)}/accept`,
      { deliveryPersonId },
    );
    return res.data;
  },

  /** POST /api/delivery-orders/{orderNumber}/reject */
  rejectOrder: async (orderNumber: string, deliveryPersonId: number, reason: string) => {
    const res = await apiClient.post(
      `/api/delivery-orders/${encodeURIComponent(orderNumber)}/reject`,
      { deliveryPersonId, reason },
    );
    return res.data;
  },

  /**
   * POST /api/delivery-orders/{orderNumber}/update-location
   * Live GPS push for an active order (also writes to Firebase RTDB via backend).
   */
  updateLocation: async (orderNumber: string, deliveryPersonId: number, lat: number, lng: number) => {
    const res = await apiClient.post(
      `/api/delivery-orders/${encodeURIComponent(orderNumber)}/update-location`,
      { deliveryPersonId, lat, lng },
    );
    return res.data;
  },

  // ─── Legacy OTP / Fulfillment ────────────────────────────────────────────

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

  /** POST /api/delivery-orders/{orderId}/cancel */
  cancelOrder: async (orderId: number, reason: string) => {
    const res = await apiClient.post(`/api/delivery-orders/${orderId}/cancel`, { reason });
    return res.data;
  },
};
