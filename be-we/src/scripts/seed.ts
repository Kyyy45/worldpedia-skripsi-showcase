import mongoose from 'mongoose';
import { env } from '../config/env';
import { HelpArticle } from '../modules/help/help.model';
import { TransactionModel } from '../modules/transaction/transaction.model';
import { EnrollmentModel } from '../modules/enrollment/enrollment.model';

// Daftar kursus contoh yang dipakai untuk membuat data pendaftaran acak di bawah.
const COURSES = [
  { courseId: '65a000000000000000000001', title: 'English Class',    slug: 'english-class',    level: 'SD–SMA' },
  { courseId: '65a000000000000000000002', title: 'KB/TK',            slug: 'kb-tk',             level: 'Prasekolah' },
  { courseId: '65a000000000000000000003', title: 'Letterland Class', slug: 'letterland-class',  level: 'Anak Usia Dini' },
  { courseId: '65a000000000000000000004', title: 'English Mastery',  slug: 'english-mastery',   level: 'Umum' },
];

const PAYMENT_METHODS = ['BCA Virtual Account', 'GoPay', 'BNI Virtual Account', 'ShopeePay'];

async function seed(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to', env.MONGODB_URI);

  // Menghapus semua data lama terlebih dahulu, supaya skrip ini bisa
  // dijalankan berkali-kali tanpa membuat data ganda menumpuk.
  await Promise.all([
    HelpArticle.deleteMany({}),
    TransactionModel.deleteMany({}),
    EnrollmentModel.deleteMany({}),
  ]);

  // --- Membuat tiga artikel bantuan contoh, yang nantinya dipakai chatbot AI ---
  await HelpArticle.insertMany([
    {
      title: 'Cara Mendaftar Kursus di Worldpedia Education',
      content:
        'Calon siswa dapat mendaftar dengan membuka halaman /courses, memilih program yang diinginkan ' +
        '(English Class, KB/TK, Letterland Class, atau English Mastery), lalu mengisi formulir pendaftaran ' +
        'dan melanjutkan ke proses pembayaran melalui Midtrans.',
      category:    'Pendaftaran',
      contextTags: ['/courses', '/checkout'],
      isPublished: true,
      viewCount:   14,
    },
    {
      title: 'Metode Pembayaran yang Tersedia',
      content:
        'Worldpedia Education menerima pembayaran melalui transfer bank (Virtual Account BCA/BNI) dan ' +
        'e-wallet (GoPay, ShopeePay) melalui integrasi Midtrans. Biaya layanan bervariasi tergantung metode yang dipilih.',
      category:    'Pembayaran',
      contextTags: ['/checkout'],
      isPublished: true,
      viewCount:   9,
    },
    {
      title: 'Cara Mengecek Status Pendaftaran',
      content:
        'Status pendaftaran dan riwayat transaksi dapat dicek melalui halaman /transactions setelah login ' +
        'menggunakan akun yang terdaftar. Status akan berubah otomatis begitu pembayaran dikonfirmasi.',
      category:    'Pendaftaran',
      contextTags: ['/transactions'],
      isPublished: true,
      viewCount:   6,
    },
  ]);

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // --- Membuat 40 transaksi acak beserta pendaftaran kursusnya (untuk dashboard analitik) ---
  const transactions: Array<Record<string, unknown>> = [];
  const enrollments:  Array<Record<string, unknown>> = [];

  for (let i = 0; i < 40; i++) {
    // Setiap transaksi diberi tanggal acak dalam 90 hari terakhir, kursus
    // yang dipilih bergantian dari daftar COURSES, dan sekitar 75% di
    // antaranya berstatus "sudah lunas" (sisanya "masih pending"). Setiap
    // kelipatan lima, transaksinya dianggap memakai kode promo.
    const course     = COURSES[i % COURSES.length];
    const daysAgo    = Math.floor(Math.random() * 90);
    const createdAt  = new Date(now - daysAgo * DAY);
    const isPaid     = Math.random() > 0.25;
    const grandTotal = 250_000 + Math.floor(Math.random() * 5) * 50_000;
    const hasPromo   = i % 5 === 0;

    transactions.push({
      createdAt,
      payment: {
        status: isPaid ? 'paid' : 'pending',
        paidAt: isPaid ? createdAt : undefined,
      },
      financials: {
        grandTotal,
        discountAmount: hasPromo ? 25_000 : 0,
      },
      promotionSnapshot: hasPromo ? { code: 'HEMAT10', type: 'PERCENTAGE' } : undefined,
      paymentMethodSnapshot: {
        providerName: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
      },
    });

    // Pendaftaran kursus hanya dibuat untuk transaksi yang sudah lunas —
    // transaksi yang masih pending belum dianggap sebagai pendaftaran resmi.
    if (isPaid) {
      enrollments.push({
        createdAt,
        status: 'active',
        courseSnapshot: course,
      });
    }
  }

  await TransactionModel.insertMany(transactions);
  await EnrollmentModel.insertMany(enrollments);

  console.log(`Seed selesai: 3 artikel bantuan, ${transactions.length} transaksi, ${enrollments.length} enrollment.`);
  await mongoose.disconnect();
}

// Menjalankan fungsi seed() di atas. Kalau ada error di tengah proses,
// pesan errornya dicetak dan skrip dihentikan dengan kode gagal.
seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
