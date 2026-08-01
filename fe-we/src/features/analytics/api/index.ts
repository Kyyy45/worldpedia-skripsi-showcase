import { apiV2 as api } from '@/shared/api';
import type { ApiResponse } from '@/shared/types';
import type {
  AnalyticsPeriod,
  RevenueAnalytics,
  TransactionAnalytics,
  EnrollmentAnalytics,
  CourseAnalytics,
  CourseEnrollmentItem,
  PromotionAnalytics,
  PaymentMethodAnalytics,
} from '@/shared/types/analytics.types';

// Tipe-tipe ini diteruskan (re-export) dari shared/types/analytics.types,
// supaya bagian lain kode cukup mengimpor dari file ini tanpa perlu tahu
// bahwa tipenya sebenarnya berasal dari tempat lain.
export type {
  AnalyticsPeriod,
  RevenueAnalytics,
  TransactionAnalytics,
  EnrollmentAnalytics,
  CourseAnalytics,
  CourseEnrollmentItem,
  PromotionAnalytics,
  PaymentMethodAnalytics,
};

// Kumpulan fungsi pengambilan data analitik. Setiap fungsi mewakili satu
// endpoint di backend, dan menerima `period` (rentang waktu) sebagai parameter.
export const analyticsApi = {
  getRevenue: (period: AnalyticsPeriod) =>
    api.get<ApiResponse<RevenueAnalytics>>('/dashboard/analytics/revenue', { params: { period } }),

  getTransactions: (period: AnalyticsPeriod) =>
    api.get<ApiResponse<TransactionAnalytics>>('/dashboard/analytics/transactions', { params: { period } }),

  getEnrollments: (period: AnalyticsPeriod) =>
    api.get<ApiResponse<EnrollmentAnalytics>>('/dashboard/analytics/enrollments', { params: { period } }),

  getCourses: (limit?: number) =>
    api.get<ApiResponse<CourseAnalytics>>('/dashboard/analytics/courses', {
      params: limit ? { limit } : undefined,
    }),

  getPromotions: (period: AnalyticsPeriod, limit?: number) =>
    api.get<ApiResponse<PromotionAnalytics>>('/dashboard/analytics/promotions', {
      params: { period, ...(limit ? { limit } : {}) },
    }),

  getPayments: (period: AnalyticsPeriod) =>
    api.get<ApiResponse<PaymentMethodAnalytics>>('/dashboard/analytics/payments', { params: { period } }),
};
