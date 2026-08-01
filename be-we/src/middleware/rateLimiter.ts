import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../utils/ApiResponse';

// Fungsi ini membuat "jawaban standar" yang dikirim setiap kali batas
// permintaan terlampaui, supaya pesannya konsisten dengan format respons
// error lain di aplikasi.
const makeHandler = (message: string) =>
  (_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }): void => {
    const { statusCode, body } = ApiResponse.error(message, 429);
    res.status(statusCode).json(body);
  };

// Batas untuk membaca daftar artikel bantuan: maksimal 60 kali per menit.
export const helpArticleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      60,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: makeHandler('Too many requests to help articles. Please slow down.'),
});

// Batas untuk bertanya ke chatbot AI: hanya 5 kali per menit, karena setiap
// pertanyaan memanggil layanan AI eksternal (Gemini) yang punya kuota dan biaya.
export const helpAskLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      5,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: makeHandler('Too many AI requests, please slow down.'),
});

// Batas untuk endpoint dashboard admin: maksimal 30 kali per menit.
export const dashboardAdminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      30,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: makeHandler('Too many dashboard requests, please slow down.'),
});
