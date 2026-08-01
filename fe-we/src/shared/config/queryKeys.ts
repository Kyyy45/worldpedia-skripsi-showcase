export const queryKeys = {
  help: {
    all:         ()                                => ['help'] as const,
    adminList:   (params: Record<string, unknown>) => ['help', 'admin', 'list', params] as const,
    adminDetail: (id: string)                      => ['help', 'admin', id] as const,
    publicList:  (params: Record<string, unknown>) => ['help', 'public', 'list', params] as const,
  },
  analytics: {
    all:          ()                                => ['analytics'] as const,
    revenue:      (params: Record<string, unknown>) => ['analytics', 'revenue', params] as const,
    transactions: (params: Record<string, unknown>) => ['analytics', 'transactions', params] as const,
    enrollments:  (params: Record<string, unknown>) => ['analytics', 'enrollments', params] as const,
    courses:      (params: Record<string, unknown>) => ['analytics', 'courses', params] as const,
    promotions:   (params: Record<string, unknown>) => ['analytics', 'promotions', params] as const,
    payments:     (params: Record<string, unknown>) => ['analytics', 'payments', params] as const,
  },
} as const;
