import { z } from 'zod';

// Aturan untuk form membuat artikel baru.
export const createHelpArticleSchema = z.object({
  title:       z.string().min(3).max(200),
  content:     z.string().min(10).max(8000),
  category:    z.string().min(1).max(100),
  contextTags: z.string().optional(),
  isPublished: z.boolean(),
});

// Aturan untuk form mengubah artikel — sama seperti di atas, tapi semua
// field dibuat opsional (boleh tidak diisi) lewat .partial().
export const updateHelpArticleSchema = createHelpArticleSchema.partial();

// Kedua tipe di bawah ini "diturunkan" otomatis dari aturan Zod di atas,
// supaya bentuk data form dan aturan validasinya selalu sinkron — kalau
// aturan di atas diubah, tipe datanya ikut berubah otomatis juga.
export type CreateHelpArticleFormData = z.infer<typeof createHelpArticleSchema>;
export type UpdateHelpArticleFormData = z.infer<typeof updateHelpArticleSchema>;
