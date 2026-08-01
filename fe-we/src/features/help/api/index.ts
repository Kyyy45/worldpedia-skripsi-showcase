import { apiV2 as api } from '@/shared/api';
import type { ApiResponse, PaginatedResponse } from '@/shared/types';
import type {
  HelpArticle,
  CreateHelpArticleData,
  UpdateHelpArticleData,
  ListHelpArticlesParams,
  PublicHelpArticlesParams,
} from '@/shared/types/help.types';
import { env } from '@/shared/config/env';

// Kumpulan fungsi untuk mengelola artikel bantuan lewat backend. Nama tiap
// fungsi sudah menjelaskan tugasnya masing-masing (getPublicArticles =
// ambil artikel untuk publik, create = buat artikel baru, dst.).
export const helpApi = {
  getPublicArticles: (params?: PublicHelpArticlesParams) =>
    api.get<ApiResponse<HelpArticle[]>>('/help/articles', { params }),

  getPublicArticleById: (id: string) =>
    api.get<ApiResponse<HelpArticle>>(`/help/articles/${id}`),

  list: (params?: ListHelpArticlesParams) =>
    api.get<PaginatedResponse<HelpArticle>>('/help/admin/articles', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<HelpArticle>>(`/help/admin/articles/${id}`),

  create: (data: CreateHelpArticleData) =>
    api.post<ApiResponse<HelpArticle>>('/help/admin/articles', data),

  update: (id: string, data: UpdateHelpArticleData) =>
    api.put<ApiResponse<HelpArticle>>(`/help/admin/articles/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/help/admin/articles/${id}`),
};

// Bentuk data yang dikirim saat mengajukan pertanyaan ke chatbot.
export interface AskPayload {
  question: string;
  history:  { role: 'user' | 'model'; content: string }[];
  context?: string;
}

// Pakai fetch() langsung, bukan axios — perlu akses response.body sebagai ReadableStream untuk baca jawaban bertahap.
export async function askStream(payload: AskPayload, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${env.API_URL_V2}/help/ask`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
    if (response.status === 429) throw new Error('rate_limit');
    throw new Error('Failed to connect to help service');
  }

  return response.body;
}
