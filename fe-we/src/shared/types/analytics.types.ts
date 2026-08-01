export type AnalyticsPeriod = 'today' | 'last_7_days' | 'last_30_days' | 'last_12_months';

export interface RevenueDataPoint {
  date:    string;
  revenue: number;
  count:   number;
}

export interface RevenueAnalytics {
  period:  AnalyticsPeriod;
  data:    RevenueDataPoint[];
  summary: { total: number; count: number; average: number; previousTotal: number; changePercent: number };
}

export interface TransactionTrendPoint {
  date:  string;
  count: number;
}

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
  summary:    { totalPromoTransactions: number; totalDiscount: number };
}

export interface PaymentMethodDistributionItem {
  type:         string;
  count:        number;
  totalRevenue: number;
}

export interface PaymentMethodAnalytics {
  period:       AnalyticsPeriod;
  distribution: PaymentMethodDistributionItem[];
  summary:      { total: number; totalRevenue: number };
}
