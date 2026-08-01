import { TransactionModel } from '../transaction/transaction.model';
import { EnrollmentModel }  from '../enrollment/enrollment.model';
import {
  AnalyticsPeriod,
  RevenueDataPoint,
  RevenueSummary,
  TransactionTrendPoint,
  TransactionStatusCount,
  EnrollmentGrowthPoint,
  EnrollmentStatusCount,
  CourseEnrollmentItem,
  PromotionUsageItem,
  PaymentMethodDistributionItem,
} from './dashboard-analytics.types';

interface DateRange {
  from: Date;
  to:   Date;
}

// Mengubah pilihan rentang waktu (misalnya "last_7_days") menjadi tanggal
// awal dan akhir yang sesungguhnya, dihitung mundur dari waktu sekarang.
function getDateRange(period: AnalyticsPeriod): DateRange {
  const to   = new Date();
  let   from = new Date();

  switch (period) {
    case 'today':
      from = new Date(to.getFullYear(), to.getMonth(), to.getDate());
      break;
    case 'last_7_days':
      from = new Date(to);
      from.setDate(from.getDate() - 7);
      break;
    case 'last_30_days':
      from = new Date(to);
      from.setDate(from.getDate() - 30);
      break;
    case 'last_12_months':
      from = new Date(to);
      from.setMonth(from.getMonth() - 12);
      break;
  }

  return { from, to };
}

// Menentukan format pengelompokan tanggal pada grafik: per bulan untuk
// rentang waktu satu tahun, atau per hari untuk rentang waktu yang lebih pendek.
function dateFormat(period: AnalyticsPeriod): string {
  return period === 'last_12_months' ? '%Y-%m' : '%Y-%m-%d';
}

// Menentukan rentang waktu "periode sebelumnya" sebagai pembanding, dengan
// panjang yang sama seperti periode yang sedang dilihat, tapi persis
// sebelum periode tersebut. Contohnya, kalau pengguna memilih "7 hari
// terakhir", periode pembandingnya adalah 7 hari sebelum 7 hari terakhir
// itu (bukan 7 hari terakhir dihitung dari hari ini).
function getPreviousPeriodRange(period: AnalyticsPeriod): DateRange {
  const now = new Date();
  switch (period) {
    case 'today': {
      const startToday     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      return { from: startYesterday, to: startToday };
    }
    case 'last_7_days': {
      const to   = new Date(now); to.setDate(to.getDate() - 7);
      const from = new Date(now); from.setDate(from.getDate() - 14);
      return { from, to };
    }
    case 'last_30_days': {
      const to   = new Date(now); to.setDate(to.getDate() - 30);
      const from = new Date(now); from.setDate(from.getDate() - 60);
      return { from, to };
    }
    case 'last_12_months': {
      const to   = new Date(now); to.setMonth(to.getMonth() - 12);
      const from = new Date(now); from.setMonth(from.getMonth() - 24);
      return { from, to };
    }
  }
}

// Kalau nilai lama nol, dianggap naik 100% (atau tetap 0) — menghindari pembagian dengan nol.
export function calcChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

class DashboardAnalyticsRepository {

  // Mengambil data grafik pendapatan harian/bulanan beserta ringkasannya,
  // termasuk perbandingan dengan periode sebelumnya.
  async getRevenueData(period: AnalyticsPeriod): Promise<{
    data:    RevenueDataPoint[];
    summary: RevenueSummary;
  }> {
    const { from, to }                   = getDateRange(period);
    const { from: prevFrom, to: prevTo } = getPreviousPeriodRange(period);
    const fmt = dateFormat(period);

    // Data periode sekarang dan periode sebelumnya diambil secara
    // bersamaan supaya lebih cepat, bukan menunggu satu selesai baru
    // mengambil yang lain.
    const [data, prevResult] = await Promise.all([
      TransactionModel.aggregate<RevenueDataPoint>([
        {
          $match: {
            'payment.status':     'paid',
            'payment.paidAt': { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id:     { $dateToString: { format: fmt, date: '$payment.paidAt' } },
            revenue: { $sum: '$financials.grandTotal' },
            count:   { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', revenue: 1, count: 1 } },
      ]),
      TransactionModel.aggregate<{ total: number }>([
        {
          $match: {
            'payment.status':     'paid',
            'payment.paidAt': { $gte: prevFrom, $lte: prevTo },
          },
        },
        { $group: { _id: null, total: { $sum: '$financials.grandTotal' } } },
      ]),
    ]);

    const total         = data.reduce((sum, d) => sum + d.revenue, 0);
    const count         = data.reduce((sum, d) => sum + d.count,   0);
    const average       = count > 0 ? total / count : 0;
    const previousTotal = prevResult[0]?.total ?? 0;
    const changePercent = calcChangePercent(total, previousTotal);

    return { data, summary: { total, count, average, previousTotal, changePercent } };
  }

  // Mengambil jumlah transaksi per hari/bulan, dipakai untuk grafik tren transaksi.
  async getTransactionTrend(period: AnalyticsPeriod): Promise<TransactionTrendPoint[]> {
    const { from, to } = getDateRange(period);
    const fmt          = dateFormat(period);

    return TransactionModel.aggregate<TransactionTrendPoint>([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id:   { $dateToString: { format: fmt, date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
    ]);
  }

  // Mengelompokkan jumlah transaksi berdasarkan statusnya (paid, pending, dst).
  async getTransactionByStatus(period: AnalyticsPeriod): Promise<TransactionStatusCount[]> {
    const { from, to } = getDateRange(period);

    return TransactionModel.aggregate<TransactionStatusCount>([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id:   '$payment.status',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
    ]);
  }

  // Mengambil jumlah pendaftaran kursus baru per hari/bulan, dipakai untuk
  // grafik pertumbuhan pendaftaran.
  async getEnrollmentGrowth(period: AnalyticsPeriod): Promise<EnrollmentGrowthPoint[]> {
    const { from, to } = getDateRange(period);
    const fmt          = dateFormat(period);

    return EnrollmentModel.aggregate<EnrollmentGrowthPoint>([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id:   { $dateToString: { format: fmt, date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
    ]);
  }

  // Mengelompokkan jumlah pendaftaran berdasarkan statusnya (active, completed, dst).
  async getEnrollmentByStatus(period: AnalyticsPeriod): Promise<EnrollmentStatusCount[]> {
    const { from, to } = getDateRange(period);

    return EnrollmentModel.aggregate<EnrollmentStatusCount>([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id:   '$status',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
    ]);
  }

  // Ambil kursus paling & kurang diminati sekaligus lewat $facet — satu round-trip database, bukan dua.
  async getCourseEnrollmentRanking(limit = 10): Promise<{
    mostEnrolled:  CourseEnrollmentItem[];
    leastEnrolled: CourseEnrollmentItem[];
  }> {
    type GroupedCourse = {
      _id:             string;
      title:           string;
      slug:            string;
      level:           string;
      thumbnail?:      string;
      enrollmentCount: number;
    };

    type FacetResult = {
      mostEnrolled:  GroupedCourse[];
      leastEnrolled: GroupedCourse[];
    };

    const [result] = await EnrollmentModel.aggregate<FacetResult>([
      { $match: { status: { $in: ['active', 'completed'] } } },
      {
        $group: {
          _id:             '$courseSnapshot.courseId',
          title:           { $first: '$courseSnapshot.title' },
          slug:            { $first: '$courseSnapshot.slug' },
          level:           { $first: '$courseSnapshot.level' },
          thumbnail:       { $first: '$courseSnapshot.thumbnail' },
          enrollmentCount: { $sum: 1 },
        },
      },
      {
        $facet: {
          mostEnrolled:  [{ $sort: { enrollmentCount: -1 } }, { $limit: limit }],
          leastEnrolled: [{ $sort: { enrollmentCount:  1 } }, { $limit: limit }],
        },
      },
    ]);

    // Mengubah bentuk data mentah hasil MongoDB menjadi bentuk yang sudah
    // rapi sesuai tipe CourseEnrollmentItem, supaya field _id yang berupa
    // ID mentah diubah menjadi teks (courseId) yang siap dipakai frontend.
    const toItem = (r: GroupedCourse): CourseEnrollmentItem => ({
      courseId:        r._id.toString(),
      title:           r.title,
      slug:            r.slug,
      level:           r.level,
      thumbnail:       r.thumbnail,
      enrollmentCount: r.enrollmentCount,
    });

    return {
      mostEnrolled:  (result?.mostEnrolled  ?? []).map(toItem),
      leastEnrolled: (result?.leastEnrolled ?? []).map(toItem),
    };
  }

  // Mengambil statistik pemakaian kode promo: berapa kali dipakai, total
  // diskon yang diberikan, dan total pendapatan dari transaksi yang memakainya.
  async getPromotionUsage(period: AnalyticsPeriod, limit = 10): Promise<{
    promotions:             PromotionUsageItem[];
    totalPromoTransactions: number;
    totalDiscount:          number;
  }> {
    const { from, to } = getDateRange(period);

    const promotions = await TransactionModel.aggregate<PromotionUsageItem>([
      {
        $match: {
          promotionSnapshot: { $exists: true, $ne: null },
          'payment.status':  'paid',
          createdAt:         { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id:           '$promotionSnapshot.code',
          type:          { $first: '$promotionSnapshot.type' },
          usageCount:    { $sum: 1 },
          totalDiscount: { $sum: '$financials.discountAmount' },
          totalRevenue:  { $sum: '$financials.grandTotal' },
        },
      },
      { $sort: { usageCount: -1 } },
      { $limit: limit },
      {
        $project: {
          _id:           0,
          code:          '$_id',
          type:          1,
          usageCount:    1,
          totalDiscount: 1,
          totalRevenue:  1,
        },
      },
    ]);

    const totalPromoTransactions = promotions.reduce((s, p) => s + p.usageCount,    0);
    const totalDiscount          = promotions.reduce((s, p) => s + p.totalDiscount, 0);

    return { promotions, totalPromoTransactions, totalDiscount };
  }

  // Tiga fungsi di bawah ini semuanya mengambil "total dari periode
  // sebelumnya" untuk dijadikan pembanding — dipakai oleh
  // dashboard-analytics.service.ts untuk menghitung persentase kenaikan/penurunan.

  async getPreviousTransactionTotal(period: AnalyticsPeriod): Promise<number> {
    const { from, to } = getPreviousPeriodRange(period);
    const result = await TransactionModel.aggregate<{ total: number }>([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async getPreviousEnrollmentTotal(period: AnalyticsPeriod): Promise<number> {
    const { from, to } = getPreviousPeriodRange(period);
    const result = await EnrollmentModel.aggregate<{ total: number }>([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async getPreviousPaidTransactionCount(period: AnalyticsPeriod): Promise<number> {
    const { from, to } = getPreviousPeriodRange(period);
    const result = await TransactionModel.aggregate<{ total: number }>([
      { $match: { createdAt: { $gte: from, $lte: to }, 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    return result[0]?.total ?? 0;
  }

  // Mengelompokkan transaksi berdasarkan metode pembayaran yang dipakai
  // (misalnya GoPay, Virtual Account BCA, dst), lengkap dengan total
  // pendapatan dari masing-masing metode.
  async getPaymentMethodDistribution(period: AnalyticsPeriod): Promise<{
    distribution: PaymentMethodDistributionItem[];
    total:        number;
    totalRevenue: number;
  }> {
    const { from, to } = getDateRange(period);

    const distribution = await TransactionModel.aggregate<PaymentMethodDistributionItem>([
      {
        $match: {
          'payment.status':     'paid',
          'payment.paidAt': { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id:          '$paymentMethodSnapshot.providerName',
          count:        { $sum: 1 },
          totalRevenue: { $sum: '$financials.grandTotal' },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id:          0,
          type:         '$_id',
          count:        1,
          totalRevenue: 1,
        },
      },
    ]);

    const total        = distribution.reduce((s, d) => s + d.count,        0);
    const totalRevenue = distribution.reduce((s, d) => s + d.totalRevenue, 0);

    return { distribution, total, totalRevenue };
  }
}
export const dashboardAnalyticsRepository = new DashboardAnalyticsRepository();
