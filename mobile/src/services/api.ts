import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Resolve host IP based on Platform (Android emulator uses 10.0.2.2 to access PC localhost)
const getBaseUrls = () => {
  const host = '145.223.118.9';
  
  return {
    laravelUrl: `http://${host}:8083/api`,
    nestjsUrl: `http://${host}:4000/api/v1`,
    storageUrl: `http://${host}:8083/storage`,
  };
};

export const { laravelUrl: LARAVEL_API, nestjsUrl: NESTJS_API, storageUrl: STORAGE_URL } = getBaseUrls();

// ── Shop API Instance (Laravel E-Commerce) ────────────────────────
export const shopApi = axios.create({
  baseURL: LARAVEL_API,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── Fitness API Instance (NestJS Backend) ─────────────────────────
export const fitnessApi = axios.create({
  baseURL: NESTJS_API,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor to inject Sanctum auth token in both clients
const injectAuthToken = async (config: any) => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('Failed to retrieve auth token from SecureStore', e);
  }
  return config;
};

shopApi.interceptors.request.use(injectAuthToken, (error) => Promise.reject(error));
fitnessApi.interceptors.request.use(injectAuthToken, (error) => Promise.reject(error));

// Utility to prefix storage image URLs
export const getProductImageUrl = (coverPath?: string | null): string => {
  if (!coverPath) return 'https://via.placeholder.com/150';
  
  // If it's already a full URL, return as is
  if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
    return coverPath;
  }
  
  // Normalize leading slash
  const cleanPath = coverPath.startsWith('/') ? coverPath : `/${coverPath}`;
  return `${STORAGE_URL}${cleanPath}`;
};
