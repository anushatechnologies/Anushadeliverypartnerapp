import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.anushatechnologies.com';

export const apiClient = axios.create({
  baseURL: BASE_URL,
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('@anusha_jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Error reading JWT token from storage", error);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.message === 'Network Error') {
      console.warn(`[NETWORK ERROR] Could not reach backend: ${error.config?.baseURL}${error.config?.url}`);
      console.warn(`Please ensure ${error.config?.baseURL} is running and its port is open!`);
    }
    return Promise.reject(error);
  }
);
