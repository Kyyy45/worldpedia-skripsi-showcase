import { IHelpArticle } from './help.model';

// Data yang dikirim frontend saat membuat artikel baru.
export interface CreateHelpArticleDto {
  title:        string;
  content:      string;
  category:     string;
  contextTags?: string[];
  isPublished?: boolean;
}

// Data yang dikirim frontend saat mengubah artikel yang sudah ada — semua
// field bersifat opsional karena pengguna bisa saja hanya mengubah sebagian.
export interface UpdateHelpArticleDto {
  title?:       string;
  content?:     string;
  category?:    string;
  contextTags?: string[];
  isPublished?: boolean;
}

// Parameter pencarian/penyaringan saat menampilkan daftar artikel di halaman admin.
export interface ListHelpArticlesQuery {
  page?:     number;
  limit?:    number;
  search?:   string;
  category?: string;
  published?: boolean;
}

// Bentuk hasil daftar artikel yang sudah dipecah per halaman (pagination).
export interface PaginatedHelpArticles {
  articles:   IHelpArticle[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// Satu baris pesan dalam percakapan dengan chatbot, bisa dari pengguna
// ("user") atau dari AI ("model").
export interface ChatMessage {
  role:    'user' | 'model';
  content: string;
}

// Data yang dikirim frontend saat pengguna bertanya ke chatbot: pertanyaan
// terbaru, riwayat obrolan sebelumnya, dan halaman asal pertanyaan (context).
export interface AskDto {
  question: string;
  history:  ChatMessage[];
  context?: string;
}
