import { apiClient } from "./apiClient";

export interface ModerationResponse {
  success: boolean;
  message: string;
  [key: string]: any;
}

/**
 * Admin moderation calls for profile photo approval.
 * Base path: /api/delivery-admin/delivery-persons/{id}
 * (DeliveryAdminController.java)
 */
export const adminModerationService = {
  /**
   * Approves a Delivery Partner's Profile Photo.
   * POST /api/delivery-admin/delivery-persons/{id}/approve-photo
   * Body: { adminId }
   */
  approveProfilePhoto: async (
    deliveryPersonId: string | number,
    adminId: string | number
  ): Promise<ModerationResponse> => {
    const response = await apiClient.post(
      `/api/delivery-admin/delivery-persons/${deliveryPersonId}/approve-photo`,
      { adminId }
    );
    return response.data;
  },

  /**
   * Rejects a Delivery Partner's Profile Photo with remarks.
   * POST /api/delivery-admin/delivery-persons/{id}/reject-photo
   * Body: { adminId, remarks }
   */
  rejectProfilePhoto: async (
    deliveryPersonId: string | number,
    adminId: string | number,
    remarks: string
  ): Promise<ModerationResponse> => {
    const response = await apiClient.post(
      `/api/delivery-admin/delivery-persons/${deliveryPersonId}/reject-photo`,
      { adminId, remarks }
    );
    return response.data;
  },

  /**
   * Requests the Delivery Partner to re-upload their Profile Photo.
   * POST /api/delivery-admin/delivery-persons/{id}/request-photo-reupload
   * Body: { adminId, remarks }
   */
  requestPhotoReupload: async (
    deliveryPersonId: string | number,
    adminId: string | number,
    remarks: string
  ): Promise<ModerationResponse> => {
    const response = await apiClient.post(
      `/api/delivery-admin/delivery-persons/${deliveryPersonId}/request-photo-reupload`,
      { adminId, remarks }
    );
    return response.data;
  },
};
