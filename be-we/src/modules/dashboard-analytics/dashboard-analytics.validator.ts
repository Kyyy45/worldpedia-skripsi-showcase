import { z } from 'zod';

// Rentang waktu hanya boleh salah satu dari empat pilihan ini; kalau tidak
// diisi sama sekali, otomatis dianggap "30 hari terakhir".
const periodEnum = z
  .enum(['today', 'last_7_days', 'last_30_days', 'last_12_months'])
  .default('last_30_days');

// Batas jumlah data yang diminta (dipakai fitur peringkat kursus & promo):
// harus berupa angka bulat antara 1 sampai 50, dan boleh tidak diisi.
const limitQuery = z.coerce.number().int().min(1).max(50).optional();

export const revenueAnalyticsSchema = z.object({
  query: z.object({ period: periodEnum }),
});

export const transactionAnalyticsSchema = z.object({
  query: z.object({ period: periodEnum }),
});

export const enrollmentAnalyticsSchema = z.object({
  query: z.object({ period: periodEnum }),
});

export const courseAnalyticsSchema = z.object({
  query: z.object({ limit: limitQuery }),
});

export const promotionAnalyticsSchema = z.object({
  query: z.object({
    period: periodEnum,
    limit:  limitQuery,
  }),
});

export const paymentAnalyticsSchema = z.object({
  query: z.object({ period: periodEnum }),
});
