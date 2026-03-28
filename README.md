# POS Family Bakso

Aplikasi POS real-time untuk FAMILY BAKSO berbasis Next.js 14, TypeScript, Tailwind CSS, Supabase Realtime, Zustand, jsPDF, dan SheetJS.

## Fitur Utama

- Kasir (`/kasir`): input pesanan, add-ons, pembayaran tunai/QRIS, struk digital.
- Dapur (`/dapur`): realtime kitchen display, update status pesanan dengan optimistic UI.
- Rekap (`/rekap`): statistik, filter, pencarian, tabel paginasi, export Excel dan PDF.
- Sinkronisasi (`/sinkronisasi`): status antrean offline, tombol sinkron manual, conflict log, dan kontrol update aplikasi.
- Desain iOS-inspired, responsif mobile/tablet/desktop.
- Offline-first mode: transaksi tetap berjalan saat internet putus, data disimpan lokal dan sinkron manual saat tombol sinkron ditekan.

## Setup Cepat

1. Install dependency:

```bash
npm install
```

2. Copy environment variable dari `.env.example` menjadi `.env.local` lalu isi kredensial Supabase.

3. Jalankan migration SQL pada project Supabase:

- File migration: `supabase/migrations/001_initial.sql`
- Bisa dijalankan via SQL Editor Supabase.

4. Jalankan development server:

```bash
npm run dev
```

5. Buka aplikasi:

- http://localhost:3000/kasir
- http://localhost:3000/dapur
- http://localhost:3000/rekap

## Environment Variables

Lihat `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Arsitektur Data

Tabel utama: `orders` dengan kolom item JSONB, total, metode bayar, status, dan timestamp.

Status alur:

- `pending` -> `preparing` -> `done`
- `cancelled` untuk pembatalan

## Script

- `npm run dev` : menjalankan app dev mode
- `npm run build` : build production
- `npm run start` : jalankan build production
- `npm run lint` : linting Next.js

## Catatan

- Realtime menggunakan Supabase channel `orders-realtime`.
- Format Rupiah menggunakan locale `id-ID` (`Rp 35.000`).
- Footer global tersedia di semua halaman.
- App sudah mendukung PWA dasar (service worker + manifest) untuk akses offline pada Android tablet dan iPad (Add to Home Screen).
- Penyimpanan offline menggunakan local storage perangkat dengan antrean sinkronisasi manual.
- Konflik sinkronisasi multi-device dicatat di halaman sinkronisasi, dan server diprioritaskan jika ada data yang lebih baru.
- Update versi aplikasi tidak dipaksa otomatis; operator perlu cek update dan menekan Terapkan Update secara manual.
