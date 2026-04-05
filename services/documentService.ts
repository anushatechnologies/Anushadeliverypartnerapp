import { apiClient } from './apiClient';

export const documentService = {
  /**
   * POST /api/documents/upload — Upload KYC document (multipart/form-data)
   * Supports: AADHAAR_CARD, PAN_CARD, DRIVING_LICENSE
   */
  uploadDocument: async (deliveryPersonId: number, documentType: string, documentNumber: string | null, fileUri: string) => {
    const formData = new FormData();
    formData.append('deliveryPersonId', deliveryPersonId.toString());
    formData.append('documentType', documentType);
    if (documentNumber) formData.append('documentNumber', documentNumber);
    
    // Parse file info
    const filename = fileUri.split('/').pop() || 'document.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;
    
    formData.append('file', { uri: fileUri, name: filename, type } as any);
    
    const res = await apiClient.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
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
