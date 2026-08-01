'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/config/queryKeys';
import { analyticsApi } from '../api';
import type { AnalyticsPeriod } from '../api';

// useAnalyticsStream diteruskan (re-export) dari file terpisah karena
// isinya lebih kompleks (koneksi real-time) — lihat useAnalyticsStream.ts.
export { useAnalyticsStream } from './useAnalyticsStream';

// Nilai staleTime pada tiap hook di bawah (yaitu berapa lama data dianggap
// masih "segar" sebelum diambil ulang dari server) disesuaikan dengan
// seberapa sering data itu biasanya berubah. Data peringkat kursus
// (courses) paling jarang berubah dibanding data lain, jadi staleTime-nya
// dibuat paling panjang (10 menit), sementara data lain 5 menit.

export function useRevenueAnalytics(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: queryKeys.analytics.revenue({ period }),
    queryFn:  () => analyticsApi.getRevenue(period).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTransactionAnalytics(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: queryKeys.analytics.transactions({ period }),
    queryFn:  () => analyticsApi.getTransactions(period).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEnrollmentAnalytics(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: queryKeys.analytics.enrollments({ period }),
    queryFn:  () => analyticsApi.getEnrollments(period).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCourseAnalytics(limit?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.courses({ limit }),
    queryFn:  () => analyticsApi.getCourses(limit).then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function usePromotionAnalytics(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: queryKeys.analytics.promotions({ period }),
    queryFn:  () => analyticsApi.getPromotions(period).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePaymentAnalytics(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: queryKeys.analytics.payments({ period }),
    queryFn:  () => analyticsApi.getPayments(period).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}
