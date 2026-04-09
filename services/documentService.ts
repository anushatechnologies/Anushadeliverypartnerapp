import { buildImageFilePart } from '@/utils/multipart';
import { apiClient } from './apiClient';

export const documentService = {
  /**
   * POST /api/documents/upload — Upload KYC document (multipart/form-data)
   * Supports: AADHAAR_CARD, PAN_CARD, DRIVING_LICENSE
   */
  uploadDocument: async (
    deliveryPersonId: number,
    documentType: string,
    documentNumber: string | null,
    fileUri: string,
    jwtToken?: string,
  ) => {
    const formData = new FormData();
    formData.append('deliveryPersonId', deliveryPersonId.toString());
    formData.append('documentType', documentType);

    if (documentNumber) {
      formData.append('documentNumber', documentNumber);
    }

    const uploadUrl = '/api/documents/upload';
    const filePart = buildImageFilePart(fileUri, `${documentType.toLowerCase()}.jpg`);
    formData.append('file', filePart);

    console.log('[DOC UPLOAD] Starting upload', {
      deliveryPersonId,
      documentType,
      hasDocumentNumber: Boolean(documentNumber),
      fileUri,
      fileName: filePart.name,
      hasJwtToken: Boolean(jwtToken),
    });

    try {
      // Pass JWT via config.headers — the request interceptor strips Content-Type
      // so React Native sets the correct multipart boundary automatically.
      const res = await apiClient.post(uploadUrl, formData, {
        headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
        timeout: 120000, // 2 min for large document images
      });

      console.log('[DOC UPLOAD] Upload success', {
        deliveryPersonId,
        documentType,
        status: res.status,
        documentId: res.data?.document?.id,
        backendMessage: res.data?.message,
      });

      return res.data;
    } catch (error: any) {
      console.warn('[DOC UPLOAD] Upload failed', {
        deliveryPersonId,
        documentType,
        message: error?.message,
        status: error?.response?.status,
        response: error?.response?.data,
        url: `${error?.config?.baseURL || ''}${error?.config?.url || uploadUrl}`,
      });
      throw error;
    }
  },

  /** GET /api/documents/validation-rules — Get document validation rules */
  getValidationRules: async () => {
    const res = await apiClient.get('/api/documents/validation-rules');
    return res.data;
  },

  /** GET /api/documents/{id} — Get specific document details */
  getDocument: async (documentId: number) => {
    const res = await apiClient.get(`/api/documents/${documentId}`);
    return res.data;
  },

  /** DELETE /api/documents/{id} — Delete a rejected document */
  deleteDocument: async (documentId: number) => {
    const res = await apiClient.delete(`/api/documents/${documentId}`);
    return res.data;
  },
};
