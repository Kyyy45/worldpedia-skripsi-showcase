import { dashboardAnalyticsRepository, calcChangePercent } from './dashboard-analytics.repository';
import {
  AnalyticsPeriod,
  RevenueAnalytics,
  TransactionAnalytics,
  EnrollmentAnalytics,
  CourseAnalytics,
  PromotionAnalytics,
  PaymentMethodAnalytics,
} from './dashboard-analytics.types';

class DashboardAnalyticsService {

  // Mengambil data grafik & ringkasan pendapatan untuk rentang waktu tertentu.
  async getRevenueAnalytics(period: AnalyticsPeriod): Promise<RevenueAnalytics> {
    const { data, summary } = await dashboardAnalyticsRepository.getRevenueData(period);
    return { period, data, summary };
  }

  // Empat sumber data diambil paralel (Promise.all), bukan berurutan, supaya tidak menambah waktu tunggu.
  async getTransactionAnalytics(period: AnalyticsPeriod): Promise<TransactionAnalytics> {
    const [trend, byStatus, previousTotal, previousPaidCount] = await Promise.all([
      dashboardAnalyticsRepository.getTransactionTrend(period),
      dashboardAnalyticsRepository.getTransactionByStatus(period),
      dashboardAnalyticsRepository.getPreviousTransactionTotal(period),
      dashboardAnalyticsRepository.getPreviousPaidTransactionCount(period),
    ]);
    const total         = byStatus.reduce((s, r) => s + r.count, 0);
    const changePercent = calcChangePercent(total, previousTotal);
    return { period, trend, byStatus, summary: { total, previousTotal, changePercent, previousPaidCount } };
  }

  // Mengambil data grafik & ringkasan pendaftaran kursus, dengan pola yang
  // sama seperti fungsi transaksi di atas (data diambil paralel, lalu
  // dihitung persentase perubahannya).
  async getEnrollmentAnalytics(period: AnalyticsPeriod): Promise<EnrollmentAnalytics> {
    const [growth, byStatus, previousTotal] = await Promise.all([
      dashboardAnalyticsRepository.getEnrollmentGrowth(period),
      dashboardAnalyticsRepository.getEnrollmentByStatus(period),
      dashboardAnalyticsRepository.getPreviousEnrollmentTotal(period),
    ]);
    const total         = byStatus.reduce((s, r) => s + r.count, 0);
    const changePercent = calcChangePercent(total, previousTotal);
    return { period, growth, byStatus, summary: { total, previousTotal, changePercent } };
  }

  // Mengambil daftar kursus paling & kurang diminati.
  async getCourseAnalytics(limit?: number): Promise<CourseAnalytics> {
    const { mostEnrolled, leastEnrolled } =
      await dashboardAnalyticsRepository.getCourseEnrollmentRanking(limit);
    return { mostEnrolled, leastEnrolled };
  }

  // Mengambil statistik pemakaian kode promo/diskon.
  async getPromotionAnalytics(period: AnalyticsPeriod, limit?: number): Promise<PromotionAnalytics> {
    const { promotions, totalPromoTransactions, totalDiscount } =
      await dashboardAnalyticsRepository.getPromotionUsage(period, limit);
    return { period, promotions, summary: { totalPromoTransactions, totalDiscount } };
  }

  // Mengambil statistik pemakaian tiap metode pembayaran.
  async getPaymentMethodAnalytics(period: AnalyticsPeriod): Promise<PaymentMethodAnalytics> {
    const { distribution, total, totalRevenue } =
      await dashboardAnalyticsRepository.getPaymentMethodDistribution(period);
    return { period, distribution, summary: { total, totalRevenue } };
  }
}

export const dashboardAnalyticsService = new DashboardAnalyticsService();
