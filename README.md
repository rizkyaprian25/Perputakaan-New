# Perpustakaan NETRI

Sistem informasi dan manajemen perpustakaan sekolah **Perpustakaan NETRI** yang dirancang untuk kebutuhan operasional harian: katalog publik ramah siswa, kiosk presensi mandiri berbasis QR code dengan konfirmasi audio chime, meja sirkulasi cepat untuk staf, serta integrasi sinkronisasi data siswa dari Netri SMS.

---

## Fitur Utama

- **Katalog Publik (Widescreen):** Navigasi visual memisahkan kelompok Penunjang (buku fiksi, novel, ensiklopedia) dan Utama (buku paket pelajaran kurikulum). Menampilkan ketersediaan eksemplar fisik secara riil.
- **Kiosk Presensi Mandiri:** Layar presensi pengunjung di pintu perpustakaan. Menerima pemindaian QR kartu siswa (kamera/scanner barcode USB) atau input NIS manual dengan pencegahan absen ganda di hari yang sama.
- **Meja Sirkulasi Cepat:** Transaksi peminjaman dan pengembalian buku dengan perlindungan anti-pinjam-ganda langsung pada tingkat basis data (MySQL generated column `STORED` + `UNIQUE INDEX`).
- **Sistem Cetak Dokumen Fisik Presisi:** Lembar stiker QR punggung buku A4 (kisi 3x8 = 24 stiker, 32mm) dan kartu anggota siswa standar ISO ID-1 (86mm x 54mm, 8 kartu per lembar A4) dengan isolasi total dari layout web.
- **Integrasi Buku Pelajaran SIBI Kemendikbudristek:** Penarikan otomatis metadata dan sampul buku kurikulum sekolah resmi dari Sistem Informasi Perbukuan Indonesia (SIBI) dan Buku Indonesia Open API, melengkapi integrasi Google Books & Open Library.
- **Integrasi Master Data Netri SMS:** Tombol sinkronisasi satu klik untuk menarik master data siswa dan kelas dari Netri SMS (Supabase Cloud). Otomatis memperbarui status siswa keluar/lulus menjadi nonaktif tanpa menghapus riwayat peminjaman lama.
- **Impor Massal Excel:** Unggah berkas Excel data anggota dengan pratinjau validasi sebelum disimpan ke basis data.

---

## Kebutuhan Sistem

- **Node.js:** Versi 20 atau 22 LTS
- **Basis Data:** MySQL 8.0+ atau MariaDB 10.6+ (kompatibel penuh dengan instalasi Laragon di Windows)
- **Web Server:** Next.js 15 (dapat dipasangkan dengan Nginx sebagai reverse proxy pada port 3000)

---

## Panduan Instalasi & Pengoperasian

### 1. Persiapan Basis Data (Laragon)
Nyalakan layanan MySQL melalui Laragon (klik **Start All**). Buka terminal MySQL dan jalankan perintah:

```sql
CREATE DATABASE perpus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'perpus_app'@'127.0.0.1' IDENTIFIED BY 'BilikBacaSecret2026!';
GRANT ALL PRIVILEGES ON perpus.* TO 'perpus_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

### 2. Pemasangan Dependensi
```bash
npm install
```

### 3. Konfigurasi Lingkungan (`.env`)
Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Pastikan variabel lingkungan telah terisi:
```env
DATABASE_URL=mysql://perpus_app:BilikBacaSecret2026!@127.0.0.1:3306/perpus
APP_SECRET=bilik-baca-super-secret-key-32-chars-minimum!
NEXT_PUBLIC_APP_URL=http://localhost:3000
NETRI_SUPABASE_URL=https://lnkjzhnrstffvakkzoiy.supabase.co
NETRI_SUPABASE_KEY=eyJhbGci...
```

### 4. Migrasi & Seed Data Awal
Jalankan skrip migrasi Drizzle untuk membuat 11 tabel relasional dan constraint transaksi:
```bash
npm run db:migrate
npm run db:seed
```
*Akun bawaan admin:*
- **Username:** `admin`
- **Kata Sandi:** `AdminBilikBaca2026!`

### 5. Menjalankan Server
```bash
# Mode pengembangan
npm run dev

# Mode produksi
npm run build
npm run start
```
Aplikasi dapat diakses melalui peramban:
- **Katalog Publik:** `http://localhost:3000`
- **Kiosk Presensi:** `http://localhost:3000/kiosk`
- **Dashboard Admin:** `http://localhost:3000/admin` (Login: `http://localhost:3000/admin/login`)

---

## Pengujian Mandiri (*Smoke Test*)

Proyek ini dilengkapi dengan skrip uji verifikasi invariant sirkulasi atomik dan integritas data:
```bash
npm run test:smoke
```
Uji mandiri mencakup 6 pengujian kritis:
1. Verifikasi kelengkapan master data siswa hasil sinkronisasi Netri SMS (880+ siswa).
2. Pembuatan buku dan eksemplar uji sirkulasi.
3. Transaksi peminjaman atomik dan penguncian status eksemplar.
4. Uji invariant anti-pinjam-ganda pada tingkat basis data (`ER_DUP_ENTRY`).
5. Transaksi pengembalian buku dan pembebasan eksemplar.
6. Idempotensi presensi harian kiosk pengunjung (`uq_kunjungan_harian`).

---

## Struktur Rute Aplikasi

```text
src/app/
├── (katalog)/
│   ├── page.tsx                  # Beranda Katalog 2 Kelompok (Hiburan & Pelajaran)
│   └── katalog/[kelompok]/       # Daftar Koleksi Buku per Kelompok
├── kiosk/
│   └── page.tsx                  # Kiosk Presensi Mandiri Siswa
├── admin/
│   ├── login/                    # Autentikasi Staf (Argon2id)
│   ├── buku/                     # Manajemen Koleksi, Unit Eksemplar, & API SIBI
│   │   └── cetak-stiker/         # Rute Cetak Stiker QR Buku Presisi A4
│   ├── sirkulasi/                # Transaksi Meja Sirkulasi & Jatuh Tempo
│   │   └── cetak-struk/          # Rute Cetak Slip Sirkulasi Thermal 80mm
│   ├── anggota/                  # Kelola Anggota & Sinkronisasi Netri SMS
│   │   └── cetak-kartu/          # Rute Cetak Kartu Anggota ISO ID-1
│   ├── laporan/                  # Pusat Laporan, Rekapitulasi, & Ekspor CSV
│   └── pengaturan/               # Konfigurasi Aturan & Sistem
└── api/v1/                       # API Handlers Terproteksi
```

---

## Lisensi

Hak Cipta © 2026 Perpustakaan NETRI. Dilisensikan untuk penggunaan institusi pendidikan.
