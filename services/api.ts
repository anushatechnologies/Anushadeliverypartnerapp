import axios from "axios";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.anushatechnologies.com";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── LEGACY HELPERS ─────
// These are convenience wrappers. For full API access, use the dedicated service files:
//   - authService.ts      → /api/delivery/auth/*
//   - profileService.ts   → /api/delivery-app/* and /api/delivery-person/*
//   - orderService.ts     → /api/delivery-orders/*
//   - documentService.ts  → /api/documents/*
//   - payoutService.ts    → /api/delivery-app/payouts

/**
 * Check if a phone number is already registered.
 * Uses the auth check-phone endpoint.
 */
export const checkPhoneExists = async (phone: string) => {
  try {
    const response = await api.get(`/api/delivery/auth/check-phone/${encodeURIComponent(phone)}`);
    return response.data;
  } catch (error) {
    return { exists: false };
  }
};

/**
 * Get delivery person status by phone number.
 * Uses the delivery-app phone lookup endpoint.
 */
export const getRiderStatus = async (phone: string) => {
  try {
    const response = await api.get(`/api/delivery-app/phone/${encodeURIComponent(phone)}`);
    return response.data;
  } catch (error) {
    return { status: "not_found" };
  }
};

export default function DummyAPI() { return null; }