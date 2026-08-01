import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';

// Bentuk data yang tersimpan di dalam token setelah berhasil dibaca.
export interface AuthUser {
  sub:      string;
  email:    string;
  role:     string;
  username: string;
}

// Bagian ini menambahkan properti `user` ke tipe Request bawaan Express,
// supaya TypeScript tahu bahwa req.user boleh diisi oleh middleware di bawah.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Membaca token dari header "Authorization: Bearer <token>", verifikasi keasliannya, lalu simpan isinya ke req.user.
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication required. Provide a valid Bearer token.');
    }

    req.user = jwt.verify(authHeader.slice(7), env.JWT_SECRET) as AuthUser;
    next();
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'TokenExpiredError')
        return next(ApiError.unauthorized('Access token expired. Please generate a new demo token.'));
      if (err.name === 'JsonWebTokenError')
        return next(ApiError.unauthorized('Invalid access token.'));
    }
    next(err);
  }
};

// Sama seperti authenticate(), tapi juga terima token lewat ?token= di URL — browser tidak bisa kirim header custom pada koneksi SSE.
export const authenticateSSE = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let rawToken: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    rawToken = authHeader.slice(7);
  } else if (typeof req.query['token'] === 'string') {
    rawToken = req.query['token'];
  }

  if (!rawToken) {
    throw ApiError.unauthorized('Authentication token is required');
  }

  req.user = jwt.verify(rawToken, env.JWT_SECRET) as AuthUser;
  next();
});

// Dipasang setelah authenticate() — cek apakah role pengguna termasuk dalam role yang diizinkan, mis. authorize('admin').
export const authorize = (...minimumRoles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required'));

    if (!minimumRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(
        `Access denied. Required role: [${minimumRoles.join(' | ')}]. Your role: ${req.user.role}`
      ));
    }
    next();
  };
