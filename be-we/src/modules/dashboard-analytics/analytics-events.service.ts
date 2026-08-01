import { Response }          from 'express';
import type { ChangeStream } from 'mongodb';
import { TransactionModel }  from '../transaction/transaction.model';
import { EnrollmentModel }   from '../enrollment/enrollment.model';
import { logger }            from '../../config/logger';

type AnalyticsEvent = { invalidate: string[] } | { type: 'connected' };

// Memantau perubahan data (MongoDB Change Streams, butuh replica set) lalu broadcast ke semua client SSE terdaftar.
class AnalyticsEventsService {
  // Kumpulan semua koneksi browser yang sedang "mendengarkan" pembaruan data.
  private clients = new Set<Response>();
  private started = false;

  // Dua koneksi pemantau perubahan data, satu untuk transaksi dan satu
  // untuk pendaftaran kursus.
  private txStream: ChangeStream | null = null;
  private enStream: ChangeStream | null = null;

  // Mendaftarkan satu koneksi browser baru sebagai "pendengar" pembaruan data.
  addClient(res: Response): void {
    this.clients.add(res);
    logger.debug(`[analytics-sse] client connected (${this.clients.size} total)`);
  }

  // Menghapus satu koneksi dari daftar pendengar, biasanya dipanggil saat
  // pengguna menutup halaman atau koneksinya terputus.
  removeClient(res: Response): void {
    this.clients.delete(res);
    logger.debug(`[analytics-sse] client disconnected (${this.clients.size} remaining)`);
  }

  // Mengirim satu sinyal/pesan ke semua koneksi yang terdaftar sekaligus.
  // Kalau ternyata ada koneksi yang sudah putus tapi belum sempat dihapus
  // dari daftar, koneksi itu otomatis dibuang saat percobaan pengiriman gagal.
  broadcast(event: AnalyticsEvent): void {
    const frame = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(frame);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  // Dipanggil sekali saat server menyala (lihat server.ts). Kalau MongoDB bukan replica set, berhenti dengan tenang.
  async startWatchers(): Promise<void> {
    if (this.started) return;
    this.started = true;

    // Fungsi pembantu untuk menangani error dari koneksi pemantau: kalau
    // errornya karena MongoDB bukan replica set, cukup catat peringatan
    // dan matikan fitur ini dengan tenang. Kalau errornya sebab lain,
    // catat sebagai error sungguhan dan coba nyalakan ulang 5 detik kemudian.
    const handleStreamError = (name: string) => (err: Error) => {
      const isStandaloneError =
        err.message.includes('replica set') ||
        err.message.includes('$changeStream') ||
        err.message.includes('replicaSet');

      if (isStandaloneError) {
        logger.warn(
          `[analytics-sse] Change Streams tidak tersedia — MongoDB berjalan sebagai standalone. ` +
          `SSE push dinonaktifkan; dashboard tetap bisa direfresh manual. ` +
          `Untuk mengaktifkan di dev: jalankan mongod --replSet rs0 lalu rs.initiate().`
        );
        this.stopWatchers();
        return;
      }

      logger.error(`[analytics-sse] ${name} change stream error:`, err);
      this.stopWatchers();
      setTimeout(() => {
        if (!this.started) this.startWatchers();
      }, 5000);
    };

    try {
      // Memantau setiap data baru atau perubahan data pada koleksi
      // Transaction. Begitu terjadi, semua client diberi tahu bagian data
      // dashboard mana saja yang perlu dimuat ulang.
      this.txStream = TransactionModel.watch(
        [{ $match: { operationType: { $in: ['insert', 'update'] } } }],
      );
      this.txStream.on('change', () => {
        this.broadcast({ invalidate: ['revenue', 'transactions', 'promotions', 'payments'] });
      });
      this.txStream.on('error', handleStreamError('transaction'));

      // Hal yang sama untuk koleksi Enrollment (pendaftaran kursus).
      this.enStream = EnrollmentModel.watch(
        [{ $match: { operationType: { $in: ['insert', 'update'] } } }],
      );
      this.enStream.on('change', () => {
        this.broadcast({ invalidate: ['enrollments', 'courses'] });
      });
      this.enStream.on('error', handleStreamError('enrollment'));

      logger.info('✅ Analytics change stream watchers started');
    } catch (err) {
      const msg = (err as Error).message ?? '';
      const isStandaloneError =
        msg.includes('replica set') ||
        msg.includes('$changeStream') ||
        msg.includes('replicaSet');

      if (isStandaloneError) {
        logger.warn('[analytics-sse] Change Streams tidak tersedia (MongoDB standalone). SSE push dinonaktifkan.');
      } else {
        logger.error('[analytics-sse] Failed to start watchers:', err);
      }
      this.stopWatchers();
    }
  }

  // Mematikan kedua koneksi pemantau perubahan data.
  stopWatchers(): void {
    this.txStream?.close().catch(() => {});
    this.enStream?.close().catch(() => {});
    this.txStream = null;
    this.enStream = null;
    this.started  = false;
  }
}

export const analyticsEventsService = new AnalyticsEventsService();
