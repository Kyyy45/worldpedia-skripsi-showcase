# Worldpedia Education — Source Code Lampiran Skripsi

Repositori ini berisi **cuplikan kode terpilih** dari sistem yang dibangun untuk skripsi:

> **Perancangan Web Interaktif dengan Fitur Bantuan Dinamis dan Dashboard Analitik**
> (Studi Kasus: Worldpedia Education)
> Rizky Akbar — 222102484 — Teknik Informatika, STMIK Pontianak (2026)

Repositori ini **bukan** kode sumber lengkap platform Worldpedia Education. Modul lain di luar cakupan skripsi (autentikasi, manajemen kursus, transaksi, pendaftaran, promosi, metode pembayaran, panel admin, dsb.) **tidak disertakan** karena berada di luar ruang lingkup penelitian (lihat BAB 1 — Pembatasan Masalah) dan bersifat proprietary milik lembaga.

Hanya dua fitur yang dirancang penuh pada penelitian ini yang disertakan, dan keduanya **runnable** —
proyek mandiri yang bisa di-clone dan dijalankan sendiri (lihat *Menjalankan Demo* di bawah).
`fe-we/` memakai komponen UI, layout, dan halaman admin yang **sama persis** dengan repo utama —
bukan reimplementasi yang disederhanakan.

## Struktur

```
be-we/                    Proyek Node.js + Express.js + TypeScript + MongoDB — RUNNABLE
├── src/modules/help/               Fitur Bantuan Dinamis (chatbot RAG)
├── src/modules/dashboard-analytics/ Fitur Dashboard Analitik
├── src/modules/transaction|enrollment/ Skema minimal untuk kebutuhan demo (lihat komentar di file)
├── src/providers/gemini.provider.ts
├── src/middleware/, src/utils/, src/config/  Infrastruktur pendukung (versi ringkas)
└── src/scripts/seed.ts, mint-admin-token.ts

fe-we/                    Proyek Next.js + React + TypeScript — RUNNABLE
├── src/app/(admin)/admin/analytics/       Dashboard analitik — sama persis dgn repo utama
├── src/app/(admin)/admin/help-articles/   CRUD artikel bantuan — sama persis dgn repo utama
├── src/features/help/       HelpWidget asli (chatbot RAG) + hooks/api-nya
├── src/features/analytics/  Hooks analytics + SSE real-time (useAnalyticsStream)
└── src/shared/               UI primitives (shadcn/Radix), sidebar, tema — sama persis dgn repo utama;
                               hanya modul auth yang disederhanakan (lihat shared/lib/token.ts)
```

## Menjalankan Demo

Butuh Node.js 20+, MongoDB (lokal atau Atlas), dan API key Google Gemini gratis ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)).

**1. Backend (`be-we/`)**

```bash
cd be-we
cp .env.example .env    # isi MONGODB_URI, JWT_SECRET, GEMINI_API_KEY
npm install
npm run seed             # isi data contoh (artikel bantuan, transaksi, enrollment)
npm run mint-token        # cetak token JWT admin demo, simpan hasilnya
npm run dev               # http://localhost:5000
```

**2. Frontend (`fe-we/`)**

```bash
cd fe-we
cp .env.example .env.local   # tempel token dari `npm run mint-token` ke NEXT_PUBLIC_DEMO_TOKEN
npm install
npm run dev               # http://localhost:3000
```

Buka `http://localhost:3000`. Tidak ada layar login — token demo ditempel otomatis dari env var
`NEXT_PUBLIC_DEMO_TOKEN` ke setiap request. Widget chatbot muncul di semua halaman publik; menu
**Dashboard Analitik** dan **Help Articles** ada di `/admin/analytics` dan `/admin/help-articles`,
lengkap dengan sidebar admin (hanya dua menu tersebut yang disertakan — modul lain di luar cakupan
skripsi ini).

> Untuk melihat pembaruan real-time pada dashboard (MongoDB Change Streams), MongoDB harus berjalan sebagai replica set (`mongod --replSet rs0`, lalu `rs.initiate()` sekali di `mongosh`). Tanpa itu, seluruh endpoint tetap berfungsi normal — hanya push otomatisnya yang nonaktif (lihat komentar di `analytics-events.service.ts`).

## Referensi

Penjelasan arsitektur, alur data, dan pembahasan mendalam atas setiap cuplikan kode di repositori ini tersedia pada **BAB 5 — Hasil Penelitian**, subbab *Coding* (5.1.3), skripsi terkait.

## Lisensi

Repositori ini dilisensikan di bawah [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)](https://creativecommons.org/licenses/by-nc-nd/4.0/) — lihat file [LICENSE](LICENSE). Boleh dilihat dan dibagikan dengan mencantumkan atribusi, tapi tidak untuk penggunaan komersial atau modifikasi/distribusi ulang tanpa izin. Kode ini dipublikasikan sebagai bukti pendukung akademik (lampiran skripsi).
