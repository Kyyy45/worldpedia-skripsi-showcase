const API_URL = process.env.NEXT_PUBLIC_API_URL;
const DEMO_TOKEN = process.env.NEXT_PUBLIC_DEMO_TOKEN;

// Peringatan ini hanya muncul di log server (bukan di browser pengguna),
// untuk membantu pengembang menyadari kalau ada pengaturan yang lupa diisi.
if (!API_URL && typeof window === 'undefined') {
  console.warn('[env] NEXT_PUBLIC_API_URL is not set. API calls will fail.');
}

if (!DEMO_TOKEN && typeof window === 'undefined') {
  console.warn('[env] NEXT_PUBLIC_DEMO_TOKEN is not set. Admin API calls will 401.');
}

export const env = {
  API_URL:    API_URL ?? '',
  // Alamat backend versi 1 (API_URL) diubah otomatis menjadi versi 2, supaya
  // tidak perlu mengatur dua environment variable terpisah untuk hal yang mirip.
  API_URL_V2: (API_URL ?? '').replace(/\/v\d+$/, '/v2'),
  DEMO_TOKEN: DEMO_TOKEN ?? '',
} as const;
