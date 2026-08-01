import axios, { InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import { tokenStorage } from '../lib/token';

// Interceptor di bawah menyisipkan token ke setiap request secara otomatis, sebelum dikirim.
function createApiInstance(baseURL: string) {
  const instance = axios.create({
    baseURL,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
  });

  // Kode ini dijalankan sesaat sebelum SETIAP permintaan dikirim ke server —
  // di sinilah token admin (lihat shared/lib/token.ts) ditempelkan ke header.
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccess();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  return instance;
}

export const apiV2 = createApiInstance(env.API_URL_V2);
