'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/shared/config/env';
import { tokenStorage } from '@/shared/lib/token';

// Kalau backend mengirim sinyal "revenue perlu dimuat ulang", di sinilah
// dicocokkan dengan key data React Query yang sesuai.
const INVALIDATION_KEYS: Record<string, readonly string[]> = {
  revenue:      ['analytics', 'revenue'],
  transactions: ['analytics', 'transactions'],
  enrollments:  ['analytics', 'enrollments'],
  courses:      ['analytics', 'courses'],
  promotions:   ['analytics', 'promotions'],
  payments:     ['analytics', 'payments'],
};

const SSE_MAX_LIFETIME_MS = 30 * 60 * 1000; // reconnect setiap 30 menit agar tidak zombie

// Dipanggil sekali di halaman Dashboard Analitik — menjaga koneksi SSE tetap terbuka untuk menerima sinyal pembaruan data.
export function useAnalyticsStream(): void {
  const queryClient = useQueryClient();
  const abortRef    = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    let retryTimeout:    ReturnType<typeof setTimeout> | null = null;
    let lifetimeTimeout: ReturnType<typeof setTimeout> | null = null;

    // Fungsi ini membuka (atau membuka ulang) koneksi ke backend.
    const connect = async (): Promise<void> => {
      if (!active) return;
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      // Putus dan sambungkan ulang setiap 30 menit — mencegah koneksi
      // "zombie" yang menggantung terlalu lama tanpa alasan jelas.
      if (lifetimeTimeout) clearTimeout(lifetimeTimeout);
      lifetimeTimeout = setTimeout(() => {
        if (active) void connect();
      }, SSE_MAX_LIFETIME_MS);

      const token = tokenStorage.getAccess();
      if (!token) return;

      try {
        const res = await fetch(
          `${env.API_URL_V2}/dashboard/analytics/events`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal:  abortRef.current.signal,
          },
        );
        if (!res.ok || !res.body) return;

        // Data dari koneksi SSE datang sedikit demi sedikit dalam bentuk
        // teks mentah, jadi harus "dibaca" dan disusun ulang menjadi
        // potongan pesan yang utuh sebelum bisa diproses.
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (active) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            if (!part.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(part.slice(6));
              // Setiap sinyal yang berisi daftar "invalidate" (misalnya
              // ["revenue", "transactions"]) memicu React Query untuk
              // mengambil ulang data-data tersebut dari server.
              if (event.invalidate) {
                for (const key of event.invalidate) {
                  const queryKey = INVALIDATION_KEYS[key];
                  if (queryKey) {
                    void queryClient.invalidateQueries({ queryKey });
                  }
                }
              }
            } catch { /* abaikan frame SSE yang malformed */ }
          }
        }
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        // Koneksi putus tidak terduga → coba sambung ulang setelah 5 detik.
        if (active) {
          retryTimeout = setTimeout(() => void connect(), 5000);
        }
      }
    };

    void connect();

    // Fungsi ini dijalankan otomatis saat halaman ditutup atau komponen
    // dilepas — memastikan koneksi dan semua penjadwalan ulang ikut
    // dihentikan, supaya tidak ada koneksi yang terus berjalan sia-sia di
    // latar belakang.
    return () => {
      active = false;
      if (retryTimeout)    clearTimeout(retryTimeout);
      if (lifetimeTimeout) clearTimeout(lifetimeTimeout);
      abortRef.current?.abort();
    };
  }, [queryClient]);
}
