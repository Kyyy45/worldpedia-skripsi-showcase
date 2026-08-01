import type { Metadata } from 'next';
import { Geist, Geist_Mono, Newsreader } from 'next/font/google';
import { Providers } from '@/shared/providers';
import { HelpWidget } from '@/features/help/components/HelpWidget';
import './globals.css';

// Tiga font ini diunduh dan disiapkan oleh Next.js saat aplikasi dibangun,
// lalu dipakai lewat variabel CSS (--font-sans, dst.) di globals.css.
const geistSans = Geist({
  variable: '--font-sans',
  subsets:  ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets:  ['latin'],
});

const newsreader = Newsreader({
  variable: '--font-serif',
  subsets:  ['latin'],
  weight:   ['300', '400', '600'],
  style:    ['normal', 'italic'],
});

// Informasi yang muncul di tab browser (judul) dan di mesin pencari (deskripsi).
export const metadata: Metadata = {
  title: 'Worldpedia Skripsi — Demo',
  description: 'Demo fitur bantuan dinamis & dashboard analitik, lampiran skripsi Rizky Akbar (222102484)',
};

// Komponen ini "membungkus" seluruh isi aplikasi. Semua halaman (children)
// akan ditampilkan di dalam <Providers>, dan widget chatbot (<HelpWidget />)
// dipasang di luar children supaya selalu tampil mengambang di semua halaman.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <HelpWidget />
      </body>
    </html>
  );
}
