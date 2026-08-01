import { z } from 'zod';
import dotenv from 'dotenv';

// Membaca isi file .env dan memasukkannya ke process.env milik Node.js.
dotenv.config();

// Daftar pengaturan yang wajib ada beserta aturan validasinya. Jika salah
// satu tidak diisi atau formatnya salah, aplikasi tidak akan dijalankan
// sama sekali — ini mencegah error yang membingungkan di tengah jalan.
const envSchema = z.object({
  NODE_ENV:    z.enum(['development', 'production', 'test']).default('development'),
  PORT:        z.string().default('5000').transform(Number),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  GEMINI_API_KEY: z.string().optional(),

  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

// Kalau validasi gagal, tampilkan pesan error yang jelas lalu hentikan proses.
if (!parsed.success) {
  console.error('Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}
export const env = parsed.data;
export type Env = typeof env;
