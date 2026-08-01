'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/layout/ThemeProvider';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { Toaster } from '@/shared/ui/sonner';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // React Query butuh satu "manajer data" (QueryClient) yang dipakai
  // bersama oleh seluruh aplikasi. Dibuat lewat useState seperti ini
  // (bukan langsung `new QueryClient()`) supaya hanya dibuat satu kali
  // saja, tidak dibuat ulang setiap komponen ini digambar ulang.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data yang sudah diambil dianggap "masih segar" selama 1
            // menit — dalam waktu itu, permintaan data yang sama tidak
            // akan diulang ke server, cukup pakai data yang sudah ada.
            staleTime: 60 * 1000,
            // Kalau gagal karena alasan yang tidak akan berubah walau
            // dicoba lagi (butuh login, tidak berizin, data tidak
            // ditemukan, atau kena batas jumlah request), percobaan ulang
            // otomatis dihentikan supaya tidak membuang-buang request.
            retry: (failureCount, error) => {
              const status = (error as { response?: { status?: number } })?.response?.status;
              if (status === 401 || status === 403 || status === 404 || status === 429) return false;
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
