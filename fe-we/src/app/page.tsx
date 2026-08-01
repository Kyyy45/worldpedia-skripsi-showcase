import Link from 'next/link';
import { BarChart3Icon, MessageCircleIcon } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6 sm:p-10">
      <div className="max-w-2xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Worldpedia Education — Demo Skripsi</h1>
          <p className="text-sm text-muted-foreground">
            Demo fitur <strong>Bantuan Dinamis</strong> (chatbot RAG, klik ikon di pojok kanan bawah)
            dan <strong>Dashboard Analitik</strong> dari skripsi Rizky Akbar (222102484). Halaman admin
            di bawah ini tidak memerlukan login.
          </p>
        </header>

        {/* Dua kartu tautan menuju halaman admin */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/analytics"
            className="flex items-center gap-3 rounded-xl border bg-card p-5 transition-colors hover:bg-muted/50"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3Icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Dashboard Analitik</p>
              <p className="text-xs text-muted-foreground">Revenue, transaksi, enrollment, dan lainnya</p>
            </div>
          </Link>

          <Link
            href="/admin/help-articles"
            className="flex items-center gap-3 rounded-xl border bg-card p-5 transition-colors hover:bg-muted/50"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageCircleIcon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Help Articles</p>
              <p className="text-xs text-muted-foreground">Kelola artikel bantuan untuk chatbot</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
