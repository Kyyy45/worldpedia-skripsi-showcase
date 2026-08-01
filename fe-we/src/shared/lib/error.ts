import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '../types';

export function getErrorMessage(err: unknown): string {
  // Kalau errornya berasal dari permintaan ke backend (lewat axios), coba
  // ambil pesan error yang memang dikirim backend terlebih dahulu.
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiErrorResponse | undefined;
    if (data?.message) return data.message;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  // Kalau bentuk errornya tidak dikenali sama sekali, tampilkan pesan umum
  // daripada membiarkan halaman menampilkan sesuatu yang membingungkan.
  return 'Terjadi kesalahan yang tidak terduga.';
}
