import { Request, Response }        from 'express';
import { dashboardAnalyticsService } from './dashboard-analytics.service';
import { analyticsEventsService }    from './analytics-events.service';
import { AnalyticsPeriod }           from './dashboard-analytics.types';
import { catchAsync }                from '../../utils/catchAsync';
import { ApiResponse }               from '../../utils/ApiResponse';

// Data grafik & ringkasan pendapatan.
export const getRevenueAnalytics = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query['period'] as AnalyticsPeriod | undefined) ?? 'last_30_days';
  const result = await dashboardAnalyticsService.getRevenueAnalytics(period);
  const r = ApiResponse.success(result, 'Revenue analytics retrieved successfully');
  res.status(r.statusCode).json(r.body);
});

// Data grafik & ringkasan jumlah transaksi.
export const getTransactionAnalytics = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query['period'] as AnalyticsPeriod | undefined) ?? 'last_30_days';
  const result = await dashboardAnalyticsService.getTransactionAnalytics(period);
  const r = ApiResponse.success(result, 'Transaction analytics retrieved successfully');
  res.status(r.statusCode).json(r.body);
});

// Data grafik & ringkasan jumlah pendaftaran kursus.
export const getEnrollmentAnalytics = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query['period'] as AnalyticsPeriod | undefined) ?? 'last_30_days';
  const result = await dashboardAnalyticsService.getEnrollmentAnalytics(period);
  const r = ApiResponse.success(result, 'Enrollment analytics retrieved successfully');
  res.status(r.statusCode).json(r.body);
});

// Daftar kursus paling & kurang diminati.
export const getCourseAnalytics = catchAsync(async (req: Request, res: Response) => {
  const limit  = req.query['limit'] ? Number(req.query['limit']) : undefined;
  const result = await dashboardAnalyticsService.getCourseAnalytics(limit);
  const r = ApiResponse.success(result, 'Course analytics retrieved successfully');
  res.status(r.statusCode).json(r.body);
});

// Statistik pemakaian kode promo/diskon.
export const getPromotionAnalytics = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query['period'] as AnalyticsPeriod | undefined) ?? 'last_30_days';
  const limit  = req.query['limit'] ? Number(req.query['limit']) : undefined;
  const result = await dashboardAnalyticsService.getPromotionAnalytics(period, limit);
  const r = ApiResponse.success(result, 'Promotion analytics retrieved successfully');
  res.status(r.statusCode).json(r.body);
});

// Statistik pemakaian tiap metode pembayaran.
export const getPaymentMethodAnalytics = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query['period'] as AnalyticsPeriod | undefined) ?? 'last_30_days';
  const result = await dashboardAnalyticsService.getPaymentMethodAnalytics(period);
  const r = ApiResponse.success(result, 'Payment method analytics retrieved successfully');
  res.status(r.statusCode).json(r.body);
});

// Mendaftarkan koneksi browser sebagai "pendengar" — analyticsEventsService yang broadcast saat data berubah.
export const streamAnalyticsEvents = (req: Request, res: Response): void => {
  // Menyiapkan koneksi khusus untuk mengirim data secara terus-menerus (SSE).
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Daftarkan koneksi browser ini sebagai salah satu "pendengar" perubahan data.
  analyticsEventsService.addClient(res);

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Kalau pengguna menutup halaman atau koneksinya terputus, hapus dari
  // daftar pendengar supaya server tidak terus mencoba mengirim data ke
  // koneksi yang sudah tidak ada.
  req.on('close', () => {
    analyticsEventsService.removeClient(res);
  });
};
