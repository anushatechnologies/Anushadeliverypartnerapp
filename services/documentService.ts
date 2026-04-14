import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './apiClient';

export const documentService = {
  /**
   * POST /api/documents/upload — Upload KYC document (multipart/form-data)
   * Supports: AADHAAR_FRONT, AADHAAR_BACK, PAN_CARD, DRIVING_LICENSE, RC_BOOK, INSURANCE
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
    
    // Convert fileUri to the format expected by React Native FormData
    const filename = fileUri.split('/').pop() || `${documentType}.jpg`;
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: 'image/jpeg',
    } as any);

    const storedToken = await AsyncStorage.getItem('@anusha_jwt_token');
    const token = jwtToken || storedToken;

    console.log('[DOC UPLOAD] Starting upload via Native fetch', {
      deliveryPersonId,
      documentType,
      hasDocumentNumber: Boolean(documentNumber),
      fileName: filename,
      hasToken: Boolean(token),
    });

    const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.anushatechnologies.com';
    const init: RequestInit = {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const response = await fetch(`${BASE_URL}/api/documents/upload`, init);
    const data = await response.json();

    if (!response.ok) {
       console.warn('[DOC UPLOAD ERROR]', data);
       throw new Error(data?.message || 'Document upload failed');
    }
    
    console.log('[DOC UPLOAD] Response', data);
    return data;
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
