import { GoogleGenAI, Chat } from '@google/genai';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Menyimpan koneksi ke Gemini supaya tidak perlu dibuat ulang setiap kali
// dipakai — cukup dibuat sekali lalu dipakai berkali-kali.
let _client: GoogleGenAI | null = null;

// Koneksi ke Gemini baru benar-benar dibuat saat pertama kali dibutuhkan
// (bukan saat aplikasi baru menyala), supaya file ini tetap bisa di-import
// lebih awal tanpa langsung error kalau kunci API belum diisi.
function getClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  if (!_client) _client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return _client;
}

// Membuat sesi percakapan baru — systemInstruction menentukan perilaku AI, history menjaga konteks obrolan sebelumnya.
export function createGeminiChat(
  systemInstruction: string,
  history: Array<{ role: string; parts: Array<{ text: string }> }>,
): Chat {
  return getClient().chats.create({
    model:   'gemini-2.5-flash',
    config:  { systemInstruction },
    history,
  });
}

// Dipakai bagian lain aplikasi untuk mengecek apakah kunci API Gemini
// sudah diisi, sebelum mencoba memakai fitur chatbot.
export function isGeminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

// Baris ini langsung dijalankan begitu file ini dimuat pertama kali saat
// aplikasi menyala, untuk mencetak status konfigurasi Gemini ke log.
logger.info(`Gemini provider: ${isGeminiConfigured() ? 'configured (gemini-2.5-flash)' : 'GEMINI_API_KEY not set'}`);
