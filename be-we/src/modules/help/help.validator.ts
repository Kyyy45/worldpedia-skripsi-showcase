import { z } from 'zod';

// Aturan ini memastikan parameter `id` di alamat URL berbentuk ID MongoDB
// yang sah (24 karakter heksadesimal), dipakai berulang di beberapa endpoint.
const idParam = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
  }),
});

// Aturan untuk membuat artikel baru: judul minimal 3 karakter, isi minimal
// 10 karakter, dan seterusnya. Kalau salah satu aturan dilanggar, request
// akan ditolak sebelum sempat menyentuh database.
export const createHelpArticleSchema = z.object({
  body: z.object({
    title:       z.string().trim().min(3).max(200),
    content:     z.string().trim().min(10).max(8000),
    category:    z.string().trim().min(1).max(100),
    contextTags: z.array(z.string().trim().max(100)).optional().default([]),
    isPublished: z.boolean().optional().default(false),
  }),
});

// Aturan untuk mengubah artikel yang sudah ada — mirip dengan aturan
// membuat artikel, tapi semua field bersifat opsional (boleh tidak diisi).
export const updateHelpArticleSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
  }),
  body: z.object({
    title:       z.string().trim().min(3).max(200).optional(),
    content:     z.string().trim().min(10).max(8000).optional(),
    category:    z.string().trim().min(1).max(100).optional(),
    contextTags: z.array(z.string().trim().max(100)).optional(),
    isPublished: z.boolean().optional(),
  }),
});

// Aturan untuk pertanyaan yang dikirim ke chatbot: pertanyaan tidak boleh
// kosong dan maksimal 500 karakter, riwayat percakapan maksimal 20 pesan.
export const askSchema = z.object({
  body: z.object({
    question: z.string().trim().min(1).max(500),
    history:  z.array(
      z.object({
        role:    z.enum(['user', 'model']),
        content: z.string().max(2000),
      }),
    ).max(20).default([]),
    context: z.string().trim().max(200).optional(),
  }),
});

// Aturan untuk mengambil daftar artikel di halaman admin. Perhatikan bahwa
// `page`, `limit`, dan `published` datang sebagai teks dari query string
// (misalnya "?page=2"), lalu di sini langsung diubah (transform) menjadi
// tipe angka atau boolean yang sesungguhnya.
export const listHelpArticlesSchema = z.object({
  query: z.object({
    page:      z.string().optional().transform(v => v ? parseInt(v, 10) : 1),
    limit:     z.string().optional().transform(v => v ? parseInt(v, 10) : 20),
    search:    z.string().optional(),
    category:  z.string().optional(),
    published: z.string().optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
  }),
});

export const helpArticleIdParamSchema = idParam;

// Aturan untuk pencarian artikel di halaman publik (bukan admin) — lebih
// sederhana karena pengguna umum tidak butuh filter status publikasi.
export const publicArticlesSchema = z.object({
  query: z.object({
    context:  z.string().trim().max(200).optional(),
    search:   z.string().trim().max(200).optional(),
    category: z.string().trim().max(100).optional(),
  }),
});
