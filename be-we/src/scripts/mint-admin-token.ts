import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// Token dibuat berumur sangat panjang (~10 tahun), supaya tidak perlu
// dibuat ulang setiap beberapa hari — cukup dibuat sekali untuk keperluan demo.
const EXPIRES_IN = '3650d';

// jwt.sign() membuat token baru: bagian pertama adalah data yang mau
// disimpan di dalam token (identitas admin contoh), bagian kedua adalah
// kunci rahasia yang dipakai untuk menandatangani token supaya tidak bisa
// dipalsukan, dan bagian ketiga adalah pengaturan masa berlaku.
const token = jwt.sign(
  { sub: 'demo-admin-id', email: 'admin@worldpedia.id', role: 'admin', username: 'admin' },
  env.JWT_SECRET,
  { expiresIn: EXPIRES_IN },
);

console.log(`\nDemo admin JWT (berlaku ${EXPIRES_IN}) — pakai sebagai Bearer token untuk endpoint`);
console.log('/help/admin/* dan /dashboard/analytics/* :\n');
console.log(token);
console.log();
