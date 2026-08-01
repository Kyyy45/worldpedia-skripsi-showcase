import { HelpArticle, IHelpArticle } from './help.model';
import { CreateHelpArticleDto, UpdateHelpArticleDto, ListHelpArticlesQuery } from './help.types';
type MongoFilter = Record<string, any>;

class HelpRepository {

  // Mencari satu artikel berdasarkan ID-nya, tanpa peduli status publikasinya.
  // Dipakai halaman admin, yang boleh melihat artikel draft maupun yang sudah terbit.
  async findById(id: string): Promise<IHelpArticle | null> {
    return HelpArticle.findById(id).lean();
  }

  // Sama seperti di atas, tapi hanya mengembalikan artikel yang statusnya
  // sudah dipublikasikan — dipakai halaman publik, supaya draft yang belum
  // selesai ditulis tidak ikut terlihat oleh pengunjung biasa.
  async findPublishedById(id: string): Promise<IHelpArticle | null> {
    return HelpArticle.findOne({ _id: id, isPublished: true }).lean();
  }

  // Pencarian untuk chatbot AI, 3 tahap: cocokkan tag halaman, lalu cari kata kunci, lalu fallback ke artikel terpopuler.
  async findForRetrieval(question: string, context?: string, limit = 5): Promise<IHelpArticle[]> {
    const results: IHelpArticle[] = [];

    // Tahap 1: cari lewat tag halaman (context), karena ini paling relevan
    // — kita sudah tahu persis halaman apa yang sedang dilihat pengguna.
    if (context) {
      const contextMatches = await HelpArticle.find(
        { isPublished: true, contextTags: { $in: [context] } },
      )
        .sort({ viewCount: -1 })
        .limit(3)
        .lean();
      results.push(...contextMatches);
    }

    // Tahap 2: cari lewat pencarian kata kunci (full-text search) dari isi
    // pertanyaan. Kalau index pencarian belum siap atau terjadi error,
    // bagian ini cukup dilewati saja (tidak menggagalkan seluruh proses).
    const usedIds = new Set(results.map(a => String(a._id)));
    let textMatches: IHelpArticle[] = [];
    try {
      textMatches = await HelpArticle.find(
        { isPublished: true, $text: { $search: question } },
        { score: { $meta: 'textScore' } },
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean();
    } catch {
    }

    for (const article of textMatches) {
      if (!usedIds.has(String(article._id))) {
        results.push(article);
        usedIds.add(String(article._id));
      }
    }

    // Tahap 3: kalau dua tahap di atas sama sekali tidak menemukan artikel
    // apa pun, tampilkan saja artikel-artikel paling populer sebagai jawaban
    // cadangan, daripada chatbot tidak punya bahan jawaban sama sekali.
    if (results.length === 0) {
      const fallback = await HelpArticle.find({ isPublished: true })
        .sort({ viewCount: -1 })
        .limit(limit)
        .lean();
      results.push(...fallback);
    }

    const finalResults = results.slice(0, limit);

    // Setiap artikel yang dipakai untuk menjawab pertanyaan dicatat sebagai
    // "dibaca satu kali" — proses pencatatan ini dijalankan di latar
    // belakang tanpa ditunggu, supaya kalaupun gagal tidak memperlambat
    // atau mengganggu jawaban chatbot yang sedang dikirim ke pengguna.
    if (finalResults.length > 0) {
      const ids = finalResults.map(a => a._id);
      HelpArticle.updateMany({ _id: { $in: ids } }, { $inc: { viewCount: 1 } }).exec().catch(err => {
        console.error('Failed to increment viewCount for RAG articles:', err);
      });
    }

    return finalResults;
  }

  // Mengambil daftar artikel yang sudah dipublikasikan, dipakai halaman
  // publik. Bisa disaring lewat tag halaman, kata kunci pencarian, atau kategori.
  async findPublished(context?: string, search?: string, category?: string): Promise<IHelpArticle[]> {
    const filter: MongoFilter = { isPublished: true };
    if (context) filter.contextTags = { $in: [context] };
    if (category) filter.category = category;

    if (search) {
      return HelpArticle.find(
        { ...filter, $text: { $search: search } },
        { score: { $meta: 'textScore' } },
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(20)
        .lean();
    }

    return HelpArticle.find(filter).sort({ viewCount: -1 }).limit(20).lean();
  }

  // Mengambil daftar artikel untuk halaman admin, sudah dipecah per halaman
  // (pagination) supaya tidak semua data dimuat sekaligus kalau jumlahnya banyak.
  async findAll(query: ListHelpArticlesQuery): Promise<IHelpArticle[]> {
    const { page = 1, limit = 20, search, category, published } = query;
    const filter: MongoFilter = {};
    if (typeof published === 'boolean') filter.isPublished = published;
    if (category) filter.category = category;

    if (search) {
      return HelpArticle.find({ ...filter, $text: { $search: search } })
        .sort({ score: { $meta: 'textScore' } })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    return HelpArticle.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  // Menghitung total artikel yang cocok dengan filter tertentu — dipakai
  // untuk menentukan berapa total halaman yang tersedia di halaman admin.
  async count(query: ListHelpArticlesQuery): Promise<number> {
    const { search, category, published } = query;
    const filter: MongoFilter = {};
    if (typeof published === 'boolean') filter.isPublished = published;
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };
    return HelpArticle.countDocuments(filter);
  }

  // Menyimpan artikel baru ke database.
  async create(dto: CreateHelpArticleDto): Promise<IHelpArticle> {
    const doc = await HelpArticle.create(dto);
    return doc.toObject();
  }

  // Mengubah artikel yang sudah ada, lalu mengembalikan versi terbarunya.
  async update(id: string, dto: UpdateHelpArticleDto): Promise<IHelpArticle | null> {
    return HelpArticle.findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' }).lean();
  }

  // Menambah hitungan "berapa kali artikel ini dibaca" sebanyak satu.
  async incrementViewCount(id: string): Promise<void> {
    await HelpArticle.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
  }

  // Menghapus artikel dari database secara permanen.
  async delete(id: string): Promise<IHelpArticle | null> {
    return HelpArticle.findByIdAndDelete(id).lean();
  }
}
export const helpRepository = new HelpRepository();
