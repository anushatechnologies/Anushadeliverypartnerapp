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

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const method = originalRequest?.method?.toUpperCase?.() || 'REQUEST';
    const url = `${originalRequest?.baseURL || ''}${originalRequest?.url || ''}`;

    // 1. Handle 401 Unauthorized errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't refresh if the request was ALREADY to the login or refresh endpoint
      const isAuthRequest = originalRequest.url.includes('/auth/login') || 
                            originalRequest.url.includes('/auth/refresh');
      
      if (!isAuthRequest) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await AsyncStorage.getItem('@anusha_refresh_token');
          if (!refreshToken) throw new Error('No refresh token available');

          console.log('[AUTH] Token expired, attempting silent refresh...');
          
          // Use a clean axios instance or a direct call to avoid interceptor recursion if possible
          // But here we'll just use the authService which we know hits the right URL
          const { authService } = require('./authService');
          const refreshRes = await authService.refresh(refreshToken);
          
          const newToken = refreshRes.accessToken || refreshRes.jwtToken || refreshRes.token;
          const newRefresh = refreshRes.refreshToken;

          if (newToken) {
            await AsyncStorage.setItem('@anusha_jwt_token', newToken);
            if (newRefresh) {
              await AsyncStorage.setItem('@anusha_refresh_token', newRefresh);
            }
            
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            processQueue(null, newToken);
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          console.warn('[AUTH] Silent refresh failed, forcing logout');
          // Optional: You could trigger a global event here to redirect to login
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }

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
