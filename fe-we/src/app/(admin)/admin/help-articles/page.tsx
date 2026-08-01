'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BookOpenIcon, PlusIcon, MoreHorizontalIcon, PencilIcon,
  Trash2Icon, LoaderCircleIcon, SearchIcon, CheckCircleIcon, XCircleIcon,
  ChevronLeftIcon, ChevronRightIcon,
} from 'lucide-react';

import { SidebarTrigger } from '@/shared/ui/sidebar';
import { Separator } from '@/shared/ui/separator';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,
} from '@/shared/ui/breadcrumb';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/shared/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

import { formatDate } from '@/shared/lib/format';
import type { HelpArticle } from '@/shared/types/help.types';
import {
  createHelpArticleSchema, updateHelpArticleSchema,
  type CreateHelpArticleFormData,
} from '@/features/help/schemas';
import {
  useListAdminHelpArticles,
  useCreateHelpArticle,
  useUpdateHelpArticle,
  useDeleteHelpArticle,
} from '@/features/help/hooks';

// Dua fungsi ini saling berkebalikan: form hanya bisa mengetik teks biasa
// di satu kotak input, sedangkan data di database menyimpan tag sebagai
// daftar (array) terpisah. tagsToString mengubah daftar jadi teks
// (dipisah koma) untuk ditampilkan di form, dan stringToTags mengubahnya
// kembali jadi daftar saat form dikirim.
function tagsToString(tags: string[]): string {
  return tags.join(', ');
}

function stringToTags(s: string): string[] {
  return s.split(',').map(t => t.trim()).filter(Boolean);
}

interface ArticleFormProps {
  defaultValues?: Partial<CreateHelpArticleFormData>;
  onSubmit:       (data: CreateHelpArticleFormData) => void;
  isPending:      boolean;
}

/** Form create & edit artikel berbagi komponen ini — bedanya hanya defaultValues yang dioper dari pemanggil. */
function ArticleForm({ defaultValues, onSubmit, isPending }: ArticleFormProps) {
  const form = useForm<CreateHelpArticleFormData>({
    resolver:      zodResolver(createHelpArticleSchema),
    defaultValues: { isPublished: false, contextTags: '', ...defaultValues },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input {...form.register('title')} placeholder="Cara membayar menggunakan Midtrans" className="placeholder:text-muted-foreground/50" />
        {form.formState.errors.title && (
          <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Input {...form.register('category')} placeholder="Transaksi" className="placeholder:text-muted-foreground/50" />
        {form.formState.errors.category && (
          <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>
          Context Tags
          <span className="text-muted-foreground text-xs ml-1">(comma-separated, e.g. /transactions, /checkout)</span>
        </Label>
        <Input {...form.register('contextTags')} placeholder="/transactions, /checkout" className="placeholder:text-muted-foreground/50" />
      </div>

      <div className="space-y-1.5">
        <Label>Content</Label>
        <textarea
          {...form.register('content')}
          rows={8}
          placeholder="Tuliskan panduan di sini. Mendukung **tebal**, *miring*, dan `code`."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-ring resize-y min-h-32
            placeholder:text-muted-foreground/50"
        />
        {form.formState.errors.content && (
          <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublished"
          {...form.register('isPublished')}
          className="size-4 rounded border"
        />
        <Label htmlFor="isPublished" className="cursor-pointer">
          Publish now
        </Label>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <LoaderCircleIcon className="size-4 animate-spin mr-2" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

// Komponen halaman utama — merakit search box, tabel, tombol pagination,
// dan tiga dialog (tambah, ubah, hapus) menjadi satu halaman utuh.
export default function HelpArticlesPage() {
  // --- Status/keadaan halaman ---
  const [search,   setSearch]   = useState('');  // kata kunci pencarian
  const [page,     setPage]     = useState(1);    // halaman tabel yang sedang aktif
  const [createOpen, setCreateOpen] = useState(false);        // apakah dialog "tambah artikel" sedang terbuka
  const [editArticle,  setEditArticle]  = useState<HelpArticle | null>(null); // artikel yang sedang diedit (null = dialog edit tertutup)
  const [deleteTarget, setDeleteTarget] = useState<HelpArticle | null>(null); // artikel yang akan dihapus (null = dialog konfirmasi tertutup)

  // --- Data fetching & mutasi ---
  const LIMIT = 20;
  const { data, isLoading } = useListAdminHelpArticles({ page, limit: LIMIT, search: search || undefined });
  const createMutation = useCreateHelpArticle();
  const updateMutation = useUpdateHelpArticle();
  const deleteMutation = useDeleteHelpArticle();

  const articles = data?.data ?? [];
  const meta     = data?.meta;

  // Dipanggil saat form "tambah artikel" berhasil disubmit. Kalau berhasil
  // disimpan ke server, dialog otomatis tertutup (lihat onSuccess).
  const handleCreate = (form: CreateHelpArticleFormData) => {
    createMutation.mutate(
      {
        title:       form.title,
        content:     form.content,
        category:    form.category,
        contextTags: stringToTags(form.contextTags ?? ''),
        isPublished: form.isPublished,
      },
      { onSuccess: () => setCreateOpen(false) },
    );
  };

  // Dipanggil saat form "edit artikel" berhasil disubmit.
  const handleUpdate = (form: CreateHelpArticleFormData) => {
    if (!editArticle) return;
    updateMutation.mutate(
      {
        id: editArticle._id,
        data: {
          title:       form.title,
          content:     form.content,
          category:    form.category,
          contextTags: stringToTags(form.contextTags ?? ''),
          isPublished: form.isPublished,
        },
      },
      { onSuccess: () => setEditArticle(null) },
    );
  };

  // Dipanggil saat pengguna menekan tombol "Delete" di dialog konfirmasi.
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Help Articles</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">

        <div className="help-articles-hero-bg relative overflow-hidden rounded-2xl" style={{ minHeight: '220px' }}>
          <div className="pointer-events-none absolute"
            style={{ top: '-10%', right: '-4%', width: '55%', height: '80%',
              background: 'radial-gradient(ellipse at 65% 30%, rgba(255,255,255,0.22), transparent 60%)' }} />
          <svg className="absolute bottom-0 w-full" style={{ height: '52%' }}
            viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
            <path className="help-articles-hill-1"
              d="M0,55 C180,10 380,80 600,40 C820,0 1020,65 1200,35 C1340,15 1410,40 1440,32 L1440,120 L0,120 Z" />
          </svg>

          <svg className="absolute bottom-0 w-full" style={{ height: '38%' }}
            viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
            <path className="help-articles-hill-2"
              d="M0,55 C280,15 560,80 840,45 C1060,20 1260,65 1440,50 L1440,100 L0,100 Z" />
          </svg>

          <svg className="absolute bottom-0 w-full" style={{ height: '24%' }}
            viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
            <path className="help-articles-hill-3"
              d="M0,40 C360,5 720,60 1080,30 C1260,15 1380,45 1440,38 L1440,80 L0,80 Z" />
          </svg>
          <div className="pointer-events-none absolute inset-0 z-[5]"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.06) 45%, transparent 70%)' }} />
          <div className="absolute inset-0 z-10 flex flex-col justify-end px-6 py-7">
            <h1 className="text-xl font-bold text-white drop-shadow sm:text-2xl">Help Articles</h1>
            <p className="mt-1 text-sm drop-shadow" style={{ color: 'rgba(255,255,255,0.82)' }}>
              Manage help articles and FAQ content for users
            </p>
          </div>
        </div>

        {/* --- Search + tombol tambah artikel --- */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari artikel..."
              className="pl-9 h-9 placeholder:text-muted-foreground/50"
            />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="h-9 shrink-0 ml-auto">
            <PlusIcon className="size-4" />
            Add Article
          </Button>
        </div>

        {/* --- Tabel artikel (skeleton saat loading, empty state, lalu daftar) --- */}
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Context Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : articles.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No help articles yet. Add the first one.
                      </TableCell>
                    </TableRow>
                  )
                  : articles.map(article => (
                    <TableRow key={article._id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{article.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{article.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          {article.contextTags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5">
                              {tag}
                            </Badge>
                          ))}
                          {article.contextTags.length > 2 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                              +{article.contextTags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {article.isPublished
                          ? <Badge variant="success" className="gap-1"><CheckCircleIcon className="size-3" />Published</Badge>
                          : <Badge variant="muted" className="gap-1"><XCircleIcon className="size-3" />Draft</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-right text-sm">{article.viewCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(article.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() =>
                              setEditArticle(article)
                            }>
                              <PencilIcon className="size-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(article)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2Icon className="size-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {(meta.page - 1) * LIMIT + 1}–{Math.min(meta.page * LIMIT, meta.total)} dari {meta.total.toLocaleString('id-ID')} artikel
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage(p => p - 1)}
                disabled={!meta.hasPrevPage}
              >
                <ChevronLeftIcon className="size-3.5" />
              </Button>
              <span className="px-2 font-medium text-foreground">
                {meta.page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage(p => p + 1)}
                disabled={!meta.hasNextPage}
              >
                <ChevronRightIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* --- Dialog create, edit, dan konfirmasi delete --- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Help Article</DialogTitle>
            <DialogDescription>
              The article will be available as context for the dynamic help assistant.
            </DialogDescription>
          </DialogHeader>
          <ArticleForm onSubmit={handleCreate} isPending={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editArticle} onOpenChange={v => !v && setEditArticle(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Help Article</DialogTitle>
          </DialogHeader>
          {editArticle && (
            <ArticleForm
              defaultValues={{
                title:       editArticle.title,
                content:     editArticle.content,
                category:    editArticle.category,
                contextTags: tagsToString(editArticle.contextTags),
                isPublished: editArticle.isPublished,
              }}
              onSubmit={handleUpdate}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this article?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title}</strong> will be permanently deleted and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <LoaderCircleIcon className="size-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
