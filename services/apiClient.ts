import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.anushatechnologies.com';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s — generous for file uploads on slow networks
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('@anusha_jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CRITICAL for React Native multipart uploads:
    // When sending FormData, axios must NOT set Content-Type manually —
    // React Native's native fetch layer sets it with the correct boundary.
    // If axios sets it without boundary, the server gets a malformed body → Network Error.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  } catch (error) {
    console.error('Error reading JWT token from storage', error);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const method = error?.config?.method?.toUpperCase?.() || 'REQUEST';
    const url = `${error?.config?.baseURL || ''}${error?.config?.url || ''}`;

    if (error.message === 'Network Error') {
      console.warn('[NETWORK ERROR] Could not reach backend', {
        method,
        url,
        message: error?.message,
      });
    } else if (error?.response) {
      console.warn('[API ERROR] Backend responded with an error', {
        method,
        url,
        status: error.response.status,
        data: error.response.data,
      });
    }
    return Promise.reject(error);
  }
);
