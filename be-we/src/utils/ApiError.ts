export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: Record<string, string>[];

  constructor(
    statusCode: number,
    message: string,
    errors?: Record<string, string>[],
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Object.setPrototypeOf(this, new.target.prototype);

    Error.captureStackTrace(this, this.constructor);
  }

  // Di bawah ini adalah kumpulan "pintasan" untuk membuat error yang paling
  // sering dipakai, supaya bagian lain dari kode tidak perlu menulis kode
  // status HTTP secara manual setiap kali. Nama fungsinya sudah menjelaskan
  // jenis errornya masing-masing.

  static badRequest(message = 'Bad Request', errors?: Record<string, string>[]) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Unprocessable Entity', errors?: Record<string, string>[]) {
    return new ApiError(422, message, errors);
  }

  static internal(message = 'Internal Server Error') {
    return new ApiError(500, message, undefined, false);
  }
}
