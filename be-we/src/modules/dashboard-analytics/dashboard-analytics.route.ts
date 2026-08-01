import { Router } from 'express';
import { authenticate, authenticateSSE, authorize } from '../../middleware/authenticate';
import { validate }                   from '../../middleware/validate';
import { dashboardAdminLimiter }      from '../../middleware/rateLimiter';
import {
  revenueAnalyticsSchema,
  transactionAnalyticsSchema,
  enrollmentAnalyticsSchema,
  courseAnalyticsSchema,
  promotionAnalyticsSchema,
  paymentAnalyticsSchema,
} from './dashboard-analytics.validator';
import {
  getRevenueAnalytics,
  getTransactionAnalytics,
  getEnrollmentAnalytics,
  getCourseAnalytics,
  getPromotionAnalytics,
  getPaymentMethodAnalytics,
  streamAnalyticsEvents,
} from './dashboard-analytics.controller';

// Kumpulan middleware "penjaga" yang sama, dipakai berulang di hampir semua
// alamat pada file ini: batasi jumlah request, pastikan tokennya valid,
// lalu pastikan perannya admin.
const adminGuard = [dashboardAdminLimiter, authenticate, authorize('admin')] as const;

const dashboardAnalyticsRoute = Router();

dashboardAnalyticsRoute.get(
  '/revenue',
  ...adminGuard,
  validate(revenueAnalyticsSchema),
  getRevenueAnalytics,
);

dashboardAnalyticsRoute.get(
  '/transactions',
  ...adminGuard,
  validate(transactionAnalyticsSchema),
  getTransactionAnalytics,
);

dashboardAnalyticsRoute.get(
  '/enrollments',
  ...adminGuard,
  validate(enrollmentAnalyticsSchema),
  getEnrollmentAnalytics,
);

dashboardAnalyticsRoute.get(
  '/courses',
  ...adminGuard,
  validate(courseAnalyticsSchema),
  getCourseAnalytics,
);

dashboardAnalyticsRoute.get(
  '/promotions',
  ...adminGuard,
  validate(promotionAnalyticsSchema),
  getPromotionAnalytics,
);

dashboardAnalyticsRoute.get(
  '/payments',
  ...adminGuard,
  validate(paymentAnalyticsSchema),
  getPaymentMethodAnalytics,
);

// Alamat khusus untuk koneksi real-time (Server-Sent Events). Browser tidak
// bisa menambahkan header khusus pada jenis koneksi ini, sehingga tokennya
// dikirim lewat parameter di alamat URL — makanya di sini dipakai
// authenticateSSE, bukan gabungan middleware adminGuard biasa di atas.
dashboardAnalyticsRoute.get(
  '/events',
  authenticateSSE,
  authorize('admin'),
  streamAnalyticsEvents,
);

export default dashboardAnalyticsRoute;
