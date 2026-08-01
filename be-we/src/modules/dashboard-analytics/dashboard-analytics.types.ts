// Empat pilihan rentang waktu yang bisa dipilih pengguna di dashboard.
export type AnalyticsPeriod = 'today' | 'last_7_days' | 'last_30_days' | 'last_12_months';

// Satu titik data pada grafik pendapatan (satu hari atau satu bulan,
// tergantung rentang waktu yang dipilih).
export interface RevenueDataPoint {
  date:    string;
  revenue: number;
  count:   number;
}

// Ringkasan pendapatan: total, jumlah transaksi, rata-rata per transaksi,
// serta perbandingan dengan periode sebelumnya.
export interface RevenueSummary {
  total:         number;
  count:         number;
  average:       number;
  previousTotal: number;
  changePercent: number;
}

export interface RevenueAnalytics {
  period:  AnalyticsPeriod;
  data:    RevenueDataPoint[];
  summary: RevenueSummary;
}

export interface TransactionTrendPoint {
  date:  string;
  count: number;
}

// Jumlah transaksi dikelompokkan per status, misalnya berapa yang "paid"
// dan berapa yang masih "pending".
export interface TransactionStatusCount {
  status: string;
  count:  number;
}

export interface TransactionAnalytics {
  period:   AnalyticsPeriod;
  trend:    TransactionTrendPoint[];
  byStatus: TransactionStatusCount[];
  summary:  { total: number; previousTotal: number; changePercent: number; previousPaidCount: number };
}

export interface EnrollmentGrowthPoint {
  date:  string;
  count: number;
}

export interface EnrollmentStatusCount {
  status: string;
  count:  number;
}

export interface EnrollmentAnalytics {
  period:   AnalyticsPeriod;
  growth:   EnrollmentGrowthPoint[];
  byStatus: EnrollmentStatusCount[];
  summary:  { total: number; previousTotal: number; changePercent: number };
}

// Satu kursus beserta jumlah pendaftarnya, dipakai untuk menampilkan
// peringkat kursus paling/kurang diminati.
export interface CourseEnrollmentItem {
  courseId:        string;
  title:           string;
  slug:            string;
  level:           string;
  thumbnail?:      string;
  enrollmentCount: number;
}

export interface CourseAnalytics {
  mostEnrolled:  CourseEnrollmentItem[];
  leastEnrolled: CourseEnrollmentItem[];
}

// Satu kode promo beserta statistik pemakaiannya.
export interface PromotionUsageItem {
  code:          string;
  type:          string;
  usageCount:    number;
  totalDiscount: number;
  totalRevenue:  number;
}

export interface PromotionAnalytics {
  period:     AnalyticsPeriod;
  promotions: PromotionUsageItem[];
  summary: {
    totalPromoTransactions: number;
    totalDiscount:          number;
  };
}

// Satu metode pembayaran (misalnya GoPay atau Virtual Account) beserta
// jumlah pemakaian dan total pendapatannya.
export interface PaymentMethodDistributionItem {
  type:         string;
  count:        number;
  totalRevenue: number;
}

export interface PaymentMethodAnalytics {
  period:       AnalyticsPeriod;
  distribution: PaymentMethodDistributionItem[];
  summary: {
    total:        number;
    totalRevenue: number;
  };
}
