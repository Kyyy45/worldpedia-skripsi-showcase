export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponseBody<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>[];
  meta?: PaginationMeta;
  timestamp: string;
}

export class ApiResponse {

  // Dipakai saat request berhasil dan ada data untuk dikembalikan.
  static success<T>(
    data: T,
    message = 'Success',
    statusCode = 200
  ): { statusCode: number; body: ApiResponseBody<T> } {
    return {
      statusCode,
      body: {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Dipakai khusus setelah berhasil membuat data baru (kode status 201).
  static created<T>(
    data: T,
    message = 'Created successfully'
  ): { statusCode: number; body: ApiResponseBody<T> } {
    return ApiResponse.success(data, message, 201);
  }

  // Dipakai untuk daftar data yang dipecah per halaman (pagination), misalnya
  // daftar artikel bantuan — ada informasi tambahan seperti halaman ke berapa
  // dan berapa total halaman yang tersedia.
  static paginated<T>(
    data: T[],
    meta: PaginationMeta,
    message = 'Success'
  ): { statusCode: number; body: ApiResponseBody<T[]> } {
    return {
      statusCode: 200,
      body: {
        success: true,
        message,
        data,
        meta,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Dipakai saat terjadi kesalahan, supaya frontend bisa tahu apa yang salah
  // lewat pesan dan (kalau ada) daftar detail error per field.
  static error(
    message: string,
    statusCode = 500,
    errors?: Record<string, string>[]
  ): { statusCode: number; body: ApiResponseBody } {
    return {
      statusCode,
      body: {
        success: false,
        message,
        errors,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
