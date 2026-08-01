import express, { Application } from 'express';
import cors from 'cors';
import { env } from './config/env';
import helpRoute from './modules/help/help.route';
import dashboardAnalyticsRoute from './modules/dashboard-analytics/dashboard-analytics.route';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler';

// Urutan pemasangan middleware & rute di bawah penting — request diproses dari atas ke bawah.
const createApp = (): Application => {
  const app = express();

  // --- Middleware global: dijalankan untuk semua request, apa pun rutenya ---
  // CORS mengatur alamat website mana saja yang diizinkan memanggil API ini.
  app.use(cors({
    origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  }));
  // Mengubah body request berformat JSON menjadi objek JavaScript biasa,
  // supaya bisa dibaca lewat req.body di controller.
  app.use(express.json({ limit: '200kb' }));

  // --- Health check: alamat sederhana untuk mengecek apakah server hidup ---
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'worldpedia-skripsi-showcase-backend' });
  });

  // --- Rute fitur: semua alamat (endpoint) yang tersedia dikelompokkan per modul ---
  app.use('/api/v2/help', helpRoute);
  app.use('/api/v2/dashboard/analytics', dashboardAnalyticsRoute);

  // --- Penanganan error: harus didaftarkan paling akhir ---
  // notFoundHandler menangkap alamat yang tidak cocok dengan rute mana pun.
  // globalErrorHandler menangkap semua error yang dilempar di bagian lain aplikasi.
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};

export default createApp;
