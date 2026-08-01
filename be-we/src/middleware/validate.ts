import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

// Bentuk umum sebuah skema validasi Zod, supaya fungsi validate() di bawah
// bisa menerima skema validasi jenis apa pun (bukan hanya satu skema tetap).
interface ZodLike {
  safeParse(data: unknown): {
    success: boolean;
    data?: {
      body?:   Record<string, unknown>;
      params?: Record<string, string>;
      query?:  Record<string, unknown>;
    };
    error?: ZodError;
  };
}

// Validasi body/params/query terhadap skema yang dioper, lalu timpa req dengan hasil parse (sudah ter-transform/default).
export const validate = (schema: ZodLike) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body:   req.body,
      params: req.params,
      query:  req.query,
    });

    if (!result.success) {
      const errors = result.error!.issues.map((issue) => ({
        field:   issue.path.slice(1).join('.') || issue.path.join('.'),
        message: issue.message,
      }));
      next(ApiError.unprocessable('Validation failed', errors));
      return;
    }

    if (result.data?.body)   req.body   = result.data.body;
    if (result.data?.params) req.params = result.data.params as Record<string, string>;
    if (result.data?.query) {
      // Di versi Express yang dipakai proyek ini, req.query tidak bisa
      // ditimpa langsung dengan tanda "=" biasa karena sifatnya read-only,
      // sehingga harus menggunakan cara khusus ini (defineProperty).
      Object.defineProperty(req, 'query', {
        value:        result.data.query,
        writable:     true,
        configurable: true,
        enumerable:   true,
      });
    }

    next();
  };
