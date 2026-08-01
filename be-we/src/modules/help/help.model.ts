import { Schema, model, Document } from 'mongoose';

export interface IHelpArticle extends Document {
  title:       string;
  content:     string;
  category:    string;
  // contextTags menandai halaman mana artikel ini relevan, misalnya
  // "/checkout" untuk artikel seputar pembayaran. Dipakai chatbot untuk
  // mencari artikel yang paling nyambung dengan halaman tempat pengguna bertanya.
  contextTags: string[];
  isPublished: boolean;
  viewCount:   number;
  createdAt:   Date;
  updatedAt:   Date;
}

// Cetakan (schema) bentuk data artikel bantuan, lengkap dengan aturan
// seperti panjang maksimal judul/isi dan nilai bawaan (default) tiap field.
const helpArticleSchema = new Schema<IHelpArticle>(
  {
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    content:     { type: String, required: true, maxlength: 8000 },
    category:    { type: String, required: true, trim: true, maxlength: 100 },
    contextTags: { type: [String], default: [] },
    isPublished: { type: Boolean, default: false },
    viewCount:   { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
  },
);

// Index di bawah ini membuat pencarian & pengurutan data jadi jauh lebih
// cepat, terutama untuk koleksi data yang sudah besar. Index "text" secara
// khusus dipakai untuk fitur pencarian kata kunci di judul dan isi artikel.
helpArticleSchema.index({ title: 'text', content: 'text' }, { weights: { title: 10, content: 1 } });
helpArticleSchema.index({ isPublished: 1 });
helpArticleSchema.index({ contextTags: 1 });
helpArticleSchema.index({ viewCount: -1 });
export const HelpArticle = model<IHelpArticle>('HelpArticle', helpArticleSchema);
