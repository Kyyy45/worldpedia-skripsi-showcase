import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { logger } from '../config/logger';
import { env } from '../config/env';

// Dipanggil kalau alamat URL tidak cocok dengan rute mana pun — hasilnya error 404.
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

// Express memanggil fungsi ini setiap kali ada error dilempar (throw atau next(error)) di mana pun.
export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message    = 'Internal Server Error';
  let errors: Record<string, string>[] | undefined;

  // Urutan dari error paling spesifik (buatan sendiri) ke paling umum (bawaan library).
  if (err instanceof ApiError) {
    // Error yang sengaja dibuat sendiri oleh kode aplikasi (lihat utils/ApiError.ts).
    statusCode = err.statusCode;
    message    = err.message;
    errors     = err.errors;
  } else if (err instanceof ZodError) {
    // Error validasi input dari library Zod.
    statusCode = 422;
    message    = 'Validation failed';
    errors = err.issues.map((issue) => ({
      field:   issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    // Error validasi dari skema Mongoose (database).
    statusCode = 422;
    message    = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
  } else if ((err as NodeJS.ErrnoException).code === '11000') {
    // Kode 11000 dari MongoDB berarti ada data duplikat yang melanggar
    // aturan "harus unik" pada suatu field.
    statusCode = 409;
    const mongoErr = err as unknown as { keyValue?: Record<string, unknown> };
    const field    = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'field';
    message        = `Duplicate value for field: ${field}`;
  } else if (err instanceof mongoose.Error.CastError) {
    // Terjadi saat format data yang dikirim tidak sesuai dengan yang
    // diharapkan database, misalnya ID yang formatnya salah.
    statusCode = 400;
    message    = `Invalid ${err.path}: ${err.value}`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message    = 'Token expired';
  }

  // Error tak terduga (kode status 500 ke atas) dicatat di log server
  // supaya bisa ditelusuri, tapi detail teknisnya tidak dikirim ke pengguna.
  if (statusCode >= 500) {
    logger.error('Server Error:', {
      message: err.message,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  const { body } = ApiResponse.error(message, statusCode, errors);
  res.status(statusCode).json(body);
};
