import mongoose from 'mongoose';
import createApp from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { analyticsEventsService } from './modules/dashboard-analytics/analytics-events.service';

async function main(): Promise<void> {
  // Langkah 1: sambungkan ke database MongoDB. Kalau alamat database salah
  // atau server MongoDB belum menyala, proses akan berhenti di sini.
  await mongoose.connect(env.MONGODB_URI);
  logger.info('MongoDB connected');

  // Langkah 2: nyalakan pemantau perubahan data (untuk fitur dashboard
  // real-time). Ini harus siap sebelum server menerima request pengguna.
  await analyticsEventsService.startWatchers();

  // Langkah 3: rakit aplikasi Express (lihat app.ts) dan mulai dengarkan
  // request masuk di port yang sudah ditentukan.
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Server listening on http://localhost:${env.PORT}`);
    logger.info(`Try: GET  http://localhost:${env.PORT}/api/v2/help/articles`);
    logger.info(`Try: POST http://localhost:${env.PORT}/api/v2/help/ask`);
  });
}

// Kalau ada error saat proses penyalaan di atas (misalnya gagal konek
// database), catat errornya lalu hentikan aplikasi sepenuhnya — lebih baik
// gagal jelas di awal daripada berjalan setengah-setengah.
main().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
