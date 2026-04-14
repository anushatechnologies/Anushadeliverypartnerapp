import { apiClient } from './apiClient';

export interface DeliveryBanner {
  id: number;
  name: string;
  imageUrl: string | null;
  videoUrl: string | null;
  targetUrl: string | null;
  actionType: string | null;
  actionValue: string | null;
  isActive: boolean;
  displayOrder: number;
}

export const bannerService = {
  /**
   * Fetch all active banners for the delivery app home screen.
   * Returns an empty array on network failure (safe fallback to static slides).
   */
  getActiveBanners: async (): Promise<DeliveryBanner[]> => {
    try {
      const response = await apiClient.get('/api/delivery-app/banners');
      return response.data?.banners ?? [];
    } catch {
      return [];
    }
  },
};
