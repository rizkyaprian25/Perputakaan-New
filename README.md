# Bilik Baca

Sistem informasi dan manajemen perpustakaan sekolah yang berfokus pada kemudahan operasional harian: katalog ramah siswa, absensi kunjungan berbasis QR, dan sirkulasi peminjaman cepat untuk staf.

---

## Gambaran Fitur

* **Katalog Siswa:** Memisahkan buku bacaan umum (Hiburan) dan buku pelajaran sekolah secara tegas. Setiap judul menampilkan status ketersediaan fisik yang diperbarui otomatis.
* **Kiosk Kunjungan:** Pencatatan kehadiran mandiri di pintu masuk perpustakaan melalui pemindaian QR kartu siswa atau pengisian nomor induk manual.
* **Sirkulasi Cepat:** Peminjaman dan pengembalian buku berbasis kode eksemplar fisik dengan perlindungan tingkat basis data terhadap peminjaman ganda.
* **Pengadaan Koleksi:** Pencarian metadata buku gratis dari Google Books dan Open Library, lengkap dengan opsi penambahan manual dan penyeragaman format sampul.
* **Pengelolaan Anggota:** Dukungan impor data siswa massal melalui lembar kerja Excel/CSV dengan pratinjau validasi sebelum disimpan.

---

## Kebutuhan Sistem

* **Node.js:** Versi 20 atau 24 LTS
* **Basis Data:** MySQL 8.0+ atau MariaDB 10.6+ (kompatibel penuh dengan instalasi Laragon di Windows)
* **Web Server (Produksi):** Nginx sebagai reverse proxy ke port Next.js

---

## Panduan Instalasi Lokal

1. **Persiapan Basis Data (Laragon):**
   Nyalakan layanan MySQL melalui Laragon (port default 3306), lalu siapkan database dan akun aplikasi:
   ```sql
   CREATE DATABASE perpus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'perpus_app'@'127.0.0.1' IDENTIFIED BY 'KataSandiAnda';
   GRANT ALL PRIVILEGES ON perpus.* TO 'perpus_app'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```

2. **Pasang Dependensi Proyek:**
   ```bash
   npm install
   ```

3. **Pengaturan Berkas Lingkungan:**
   Salin `.env.example` menjadi `.env` dan sesuaikan kredensial basis data Anda:
   ```bash
   cp .env.example .env
   ```

4. **Eksekusi Migrasi & Data Awal:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Jalankan Server Pengembangan:**
   ```bash
   npm run dev
   ```
   Buka peramban di `http://localhost:3000`.

---

## Lisensi & Hak Penggunaan

Hak Cipta © 2026 Tim Pengembang Bilik Baca. Dilisensikan untuk penggunaan institusi pendidikan.
