import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { apiClient } from './apiClient';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.anushatechnologies.com';

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
    const storedToken = await AsyncStorage.getItem('@anusha_jwt_token');
    const token = jwtToken || storedToken;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const parameters: Record<string, string> = {
      deliveryPersonId: deliveryPersonId.toString(),
      documentType,
    };
    if (documentNumber) parameters.documentNumber = documentNumber;

    console.log('[DOC UPLOAD] Starting upload via FileSystem.uploadAsync', {
      deliveryPersonId,
      documentType,
      hasDocumentNumber: Boolean(documentNumber),
      fileUri,
      hasToken: Boolean(token),
    });

    const result = await FileSystem.uploadAsync(
      `${BASE_URL}/api/documents/upload`,
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: 'image/jpeg',
        parameters,
        headers,
      },
    );

    console.log('[DOC UPLOAD] Response', {
      deliveryPersonId,
      documentType,
      status: result.status,
      body: result.body,
    });

    if (result.status < 200 || result.status >= 300) {
      const msg = (() => {
        try {
          return JSON.parse(result.body)?.message;
        } catch {
          return result.body;
        }
      })();
      throw new Error(msg || `Upload failed with status ${result.status}`);
    }

    return JSON.parse(result.body);
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
