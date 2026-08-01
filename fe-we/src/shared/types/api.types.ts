export interface PaginationMeta {
  page:        number;
  limit:       number;
  total:       number;
  totalPages:  number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T = unknown> {
  success:   true;
  message:   string;
  data:      T;
  meta?:     PaginationMeta;
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> {
  success:   true;
  message:   string;
  data:      T[];
  meta:      PaginationMeta;
  timestamp: string;
}

export interface ApiErrorResponse {
  success:   false;
  message:   string;
  errors?:   Record<string, string>[];
  timestamp: string;
}
