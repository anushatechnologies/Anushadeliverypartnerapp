import * as Location from 'expo-location';
import { apiClient } from './apiClient';

type LocationCallback = (lat: number, lng: number) => void;

let _intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Phase 3 — Background GPS pinging.
 * Sends lat/lng to backend every 30 s when the rider is online.
 * Also calls the active-order live-tracking endpoint if an order is active.
 */
export const locationService = {
  /**
   * Start pinging the backend with GPS every 30 seconds.
   * Call this when the rider goes online.
   */
  startTracking(
    deliveryPersonId: number,
    activeOrderNumber: string | null,
    onLocationUpdate?: LocationCallback,
  ) {
    locationService.stopTracking(); // clear any existing interval

    const ping = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude: lat, longitude: lng } = loc.coords;

        // 1. Persist to MySQL (for Haversine queries)
        await apiClient.post('/api/delivery-app/location', { lat, lng });

        // 2. If an order is active, also push to Firebase RTDB via backend
        if (activeOrderNumber) {
          await apiClient.post(
            `/api/delivery-orders/${encodeURIComponent(activeOrderNumber)}/update-location`,
            { deliveryPersonId, lat, lng },
          );
        }

        onLocationUpdate?.(lat, lng);
      } catch (err: any) {
        // Non-fatal — GPS or network might be temporarily unavailable
        console.warn('[LocationService] ping failed:', err?.message);
      }
    };

    // Immediate first ping, then every 30 s
    ping();
    _intervalId = setInterval(ping, 30_000);
  },

  /** Stop GPS pinging. Call when rider goes offline. */
  stopTracking() {
    if (_intervalId !== null) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
  },

  /** Update the active order number so the RTDB path stays current. */
  isTracking(): boolean {
    return _intervalId !== null;
  },

  /** One-off location fetch — useful for order acceptance or distance display. */
  async getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch {
      return null;
    }
  },
};
