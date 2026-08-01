'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/shared/config/queryKeys';
import { getErrorMessage } from '@/shared/lib/error';
import { helpApi } from '../api';
import type { ListHelpArticlesParams, CreateHelpArticleData, UpdateHelpArticleData, PublicHelpArticlesParams } from '@/shared/types/help.types';

// Ketiga hook mutasi (create/update/delete) di bawah semuanya memanggil
// invalidateQueries dengan key yang sama, queryKeys.help.all() — artinya
// setelah salah satu dari ketiganya berhasil, React Query akan otomatis
// mengambil ulang daftar artikel terbaru, sehingga tabel di halaman admin
// langsung ter-update tanpa perlu di-refresh manual.

// Mengambil artikel bantuan untuk pengguna umum (bukan admin).
export function usePublicHelpArticles(params?: PublicHelpArticlesParams) {
  return useQuery({
    queryKey: queryKeys.help.publicList(params as Record<string, unknown> ?? {}),
    queryFn:  () => helpApi.getPublicArticles(params).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

// Mengambil daftar artikel untuk halaman admin.
export function useListAdminHelpArticles(params?: ListHelpArticlesParams) {
  return useQuery({
    queryKey: queryKeys.help.adminList(params as Record<string, unknown> ?? {}),
    queryFn:  () => helpApi.list(params).then(r => r.data),
    staleTime: 30 * 1000,
  });
}

// Mengambil satu artikel untuk halaman admin (misalnya saat membuka form edit).
export function useGetAdminHelpArticle(id: string) {
  return useQuery({
    queryKey: queryKeys.help.adminDetail(id),
    queryFn:  () => helpApi.getById(id).then(r => r.data.data),
    enabled:  !!id,
    staleTime: 30 * 1000,
  });
}

// Membuat artikel baru. Kalau berhasil, notifikasi sukses muncul dan
// daftar artikel di layar otomatis diperbarui. Kalau gagal, notifikasi
// error muncul dengan pesan yang sudah dirapikan lewat getErrorMessage().
export function useCreateHelpArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHelpArticleData) => helpApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.help.all() });
      toast.success('Help article created successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

// Mengubah artikel yang sudah ada.
export function useUpdateHelpArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHelpArticleData }) =>
      helpApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.help.all() });
      toast.success('Help article updated successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

// Menghapus artikel.
export function useDeleteHelpArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => helpApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.help.all() });
      toast.success('Help article deleted successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
