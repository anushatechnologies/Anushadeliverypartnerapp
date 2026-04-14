import axios from 'axios';
import { getDeliveryAccessToken, refreshDeliverySession } from './sessionService';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.anushatechnologies.com';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s — generous for file uploads on slow networks
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await getDeliveryAccessToken();
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
    const originalRequest = error?.config;
    const method = originalRequest?.method?.toUpperCase?.() || 'REQUEST';
    const url = `${originalRequest?.baseURL || ''}${originalRequest?.url || ''}`;
    const requestUrl = originalRequest?.url || '';
    const isRefreshRequest =
      requestUrl.includes('/api/delivery/auth/refresh') ||
      requestUrl.includes('/api/delivery/auth/logout') ||
      requestUrl.includes('/api/delivery/auth/login') ||
      requestUrl.includes('/api/delivery/auth/signup');

    if (error?.response?.status === 401 && originalRequest && !originalRequest._retry && !isRefreshRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshedToken = await refreshDeliverySession();
        if (refreshedToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
          processQueue(null, refreshedToken);
          return apiClient(originalRequest);
        }
        processQueue(error, null);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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
