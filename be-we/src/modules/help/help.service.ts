import { helpRepository } from './help.repository';
import { IHelpArticle } from './help.model';
import {
  CreateHelpArticleDto,
  UpdateHelpArticleDto,
  ListHelpArticlesQuery,
  PaginatedHelpArticles,
  AskDto,
  ChatMessage,
} from './help.types';
import { ApiError } from '../../utils/ApiError';
import { createGeminiChat, isGeminiConfigured } from '../../providers/gemini.provider';

class HelpArticleService {

  // page/limit dibatasi supaya tidak ada yang meminta data dalam jumlah tidak wajar.
  async list(query: ListHelpArticlesQuery): Promise<PaginatedHelpArticles> {
    const page  = Math.max(1, query.page  ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const [articles, total] = await Promise.all([
      helpRepository.findAll({ ...query, page, limit }),
      helpRepository.count(query),
    ]);
    return { articles, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Lempar error 404 kalau tidak ditemukan, supaya controller tidak perlu memeriksanya lagi.
  async getById(id: string): Promise<IHelpArticle> {
    const article = await helpRepository.findById(id);
    if (!article) throw ApiError.notFound('Help article not found');
    return article;
  }

  async create(dto: CreateHelpArticleDto): Promise<IHelpArticle> {
    return helpRepository.create(dto);
  }

  async update(id: string, dto: UpdateHelpArticleDto): Promise<IHelpArticle> {
    const updated = await helpRepository.update(id, dto);
    if (!updated) throw ApiError.notFound('Help article not found');
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await helpRepository.delete(id);
    if (!deleted) throw ApiError.notFound('Help article not found');
  }

  // Mengambil daftar artikel untuk halaman publik (hanya yang sudah terbit).
  async getPublicArticles(context?: string, search?: string, category?: string): Promise<IHelpArticle[]> {
    return helpRepository.findPublished(context, search, category);
  }

  // Mengambil satu artikel untuk halaman publik, sekaligus menambah
  // hitungan "jumlah dibaca" satu kali setiap kali artikel ini dibuka.
  async getPublicArticleById(id: string): Promise<IHelpArticle> {
    const article = await helpRepository.findPublishedById(id);
    if (!article) throw ApiError.notFound('Help article not found');
    helpRepository.incrementViewCount(id).catch(() => {});
    return article;
  }
}

// RAG (Retrieval-Augmented Generation): cari artikel relevan dulu, lalu sisipkan ke instruksi AI sebelum menjawab.
class HelpChatService {

  // Menyusun instruksi tersembunyi (system prompt) yang dikirim ke Gemini,
  // berisi kumpulan artikel yang relevan beserta aturan cara menjawab
  // (harus pakai Bahasa Indonesia, ringkas, tidak boleh mengarang, dst).
  private buildSystemPrompt(articles: IHelpArticle[]): string {
    const knowledge = articles.length > 0
      ? articles.map(a => `### ${a.title}\n${a.content}`).join('\n\n---\n\n')
      : 'Tidak ada panduan spesifik yang tersedia saat ini.';

    return `Kamu adalah asisten bantuan untuk platform Worldpedia Education, sebuah platform kursus online berbasis web.
Tugasmu adalah membantu pengguna memahami cara menggunakan sistem berdasarkan panduan berikut.

PANDUAN SISTEM:
---
${knowledge}
---

Instruksi:
- Jawab HANYA dalam Bahasa Indonesia
- Berikan jawaban yang jelas, ringkas, dan langsung ke poin
- Gunakan format yang rapi — gunakan poin atau langkah bernomor jika diperlukan
- Jika pertanyaan tidak berkaitan dengan cara menggunakan Worldpedia Education, arahkan kembali ke topik bantuan sistem
- Jika informasi tidak tersedia dalam panduan di atas, jawab: "Maaf, saya belum memiliki informasi tentang hal tersebut. Silakan hubungi tim kami untuk bantuan lebih lanjut."
- Jangan membuat asumsi di luar panduan yang diberikan`;
  }

  // Mengubah format riwayat percakapan dari bentuk yang dipakai aplikasi ini
  // menjadi bentuk yang dimengerti oleh Gemini SDK.
  private toGeminiHistory(history: ChatMessage[]) {
    return history.map(msg => ({
      role:  msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }

  // Cari artikel relevan → susun system prompt → mulai sesi Gemini → kembalikan jawaban sebagai stream.
  async prepareStream(dto: AskDto) {
    if (!isGeminiConfigured()) {
      throw ApiError.internal('GEMINI_API_KEY is not configured — dynamic help is unavailable');
    }

    // Langkah pencarian (retrieval) — bagian "R" dari RAG.
    const articles     = await helpRepository.findForRetrieval(dto.question, dto.context, 3);
    const systemPrompt = this.buildSystemPrompt(articles);
    const chat         = createGeminiChat(systemPrompt, this.toGeminiHistory(dto.history));

    return chat.sendMessageStream({ message: dto.question });
  }
}

export const helpArticleService = new HelpArticleService();
export const helpChatService    = new HelpChatService();
