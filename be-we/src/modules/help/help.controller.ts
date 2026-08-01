import { Request, Response } from 'express';
import { helpArticleService, helpChatService } from './help.service';
import { CreateHelpArticleDto, UpdateHelpArticleDto, ListHelpArticlesQuery, AskDto } from './help.types';
import { catchAsync } from '../../utils/catchAsync';
import { ApiResponse } from '../../utils/ApiResponse';
import { logger } from '../../config/logger';

// Fungsi kecil untuk mengambil nilai `id` dari alamat URL, dipakai berulang
// di beberapa fungsi di bawah supaya tidak perlu menulis ulang.
const paramId = (req: Request): string => req.params['id'] as string;

// Menampilkan daftar artikel yang boleh dilihat pengguna umum (bukan admin).
export const getPublicArticles = catchAsync(async (req: Request, res: Response) => {
  const { context, search, category } = req.query as Record<string, string | undefined>;
  const articles = await helpArticleService.getPublicArticles(context, search, category);
  const r = ApiResponse.success(articles, 'Help articles retrieved successfully');
  res.status(r.statusCode).json(r.body);
});

// Menampilkan satu artikel untuk pengguna umum berdasarkan ID-nya.
export const getPublicArticleById = catchAsync(async (req: Request, res: Response) => {
  const article = await helpArticleService.getPublicArticleById(paramId(req));
  const r = ApiResponse.success(article, 'Help article retrieved successfully');
  res.status(r.statusCode).json(r.body);
});

// Jawaban dikirim bertahap (SSE), bukan sekaligus. Tidak pakai catchAsync — error harus ditulis ke stream yang sudah terbuka.
export const ask = async (req: Request, res: Response): Promise<void> => {
  const dto = req.body as AskDto;

  // Menyiapkan koneksi khusus untuk mengirim data secara bertahap (SSE).
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Fungsi pembantu untuk mengirim satu potongan data ke frontend lewat
  // koneksi streaming yang sudah dibuka di atas.
  const write = (payload: object) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const stream = await helpChatService.prepareStream(dto);

    // Setiap kali Gemini mengirim potongan jawaban baru, langsung
    // diteruskan ke frontend saat itu juga.
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) write({ text });
    }

    write({ done: true });
  } catch (err) {
    logger.error('help/ask stream error:', err);
    // Pesan error asli dari Gemini biasanya berupa kode teknis yang tidak
    // ramah dibaca pengguna, jadi di sini diterjemahkan dulu ke Bahasa
    // Indonesia yang lebih mudah dimengerti.
    const raw = err instanceof Error ? err.message : '';
    let userMessage = 'Terjadi kesalahan. Silakan coba lagi.';
    if (raw.includes('"code":429') || raw.includes('"code": 429')) {
      userMessage = 'Kuota Gemini API habis. Silakan coba beberapa saat lagi.';
    } else if (raw.includes('"code":404') || raw.includes('"code": 404')) {
      userMessage = 'Model AI tidak tersedia. Hubungi administrator.';
    } else if (raw.includes('GEMINI_API_KEY')) {
      userMessage = 'Konfigurasi AI belum lengkap. Hubungi administrator.';
    }
    write({ error: userMessage });
  } finally {
    res.end();
  }
};

// --- Mulai dari sini, semua fungsi di bawah khusus untuk halaman admin ---

// Menampilkan daftar artikel untuk halaman admin, lengkap dengan info
// jumlah halaman (pagination) supaya tabelnya bisa punya tombol berpindah halaman.
export const listArticles = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListHelpArticlesQuery;
  const result = await helpArticleService.list(query);
  const r = ApiResponse.paginated(
    result.articles,
    {
      page:        result.page,
      limit:       result.limit,
      total:       result.total,
      totalPages:  result.totalPages,
      hasNextPage: result.page < result.totalPages,
      hasPrevPage: result.page > 1,
    },
    'Help articles retrieved successfully',
  );
  res.status(r.statusCode).json(r.body);
});

// Menampilkan satu artikel untuk keperluan admin (misalnya saat membuka form edit).
export const getArticle = catchAsync(async (req: Request, res: Response) => {
  const article = await helpArticleService.getById(paramId(req));
  const r = ApiResponse.success(article, 'Help article retrieved successfully');
  res.status(r.statusCode).json(r.body);
});

// Membuat artikel baru dari form yang diisi admin.
export const createArticle = catchAsync(async (req: Request, res: Response) => {
  const dto = req.body as CreateHelpArticleDto;
  const article = await helpArticleService.create(dto);
  const r = ApiResponse.created(article, 'Help article created successfully');
  res.status(r.statusCode).json(r.body);
});

// Mengubah artikel yang sudah ada.
export const updateArticle = catchAsync(async (req: Request, res: Response) => {
  const dto = req.body as UpdateHelpArticleDto;
  const article = await helpArticleService.update(paramId(req), dto);
  const r = ApiResponse.success(article, 'Help article updated successfully');
  res.status(r.statusCode).json(r.body);
});

// Menghapus artikel secara permanen.
export const deleteArticle = catchAsync(async (req: Request, res: Response) => {
  await helpArticleService.delete(paramId(req));
  const r = ApiResponse.success(null, 'Help article deleted successfully');
  res.status(r.statusCode).json(r.body);
});
