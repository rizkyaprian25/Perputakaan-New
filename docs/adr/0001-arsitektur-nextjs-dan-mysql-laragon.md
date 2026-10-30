# ADR 0001: Pemilihan Arsitektur Next.js 15 dan MySQL (Laragon)

- **Status:** Diterima (Accepted)
- **Tanggal:** 2026-10-30
- **Pengambil Keputusan:** Tim Arsitektur Bilik Baca

## Konteks & Latar Belakang
Sistem perpustakaan sekolah "Bilik Baca" membutuhkan antarmuka yang cepat untuk siswa (katalog dan kiosk absensi) sekaligus panel administrasi yang aman bagi petugas perpustakaan. Aplikasi di-deploy di lingkungan PC sekolah menggunakan server Windows dengan instalasi Laragon (MySQL/MariaDB).

## Keputusan
Memilih **Next.js 15 (App Router) + TypeScript Strict** sebagai framework full-stack tunggal, terhubung ke **MySQL 8.0 (Laragon)** melalui Drizzle ORM.

## Konsekuensi & Justifikasi
1. **Single Language (TypeScript Full-Stack):** Kontrak data (`src/contracts/`) didefinisikan satu kali menggunakan Zod dan di-share langsung antara API route handlers dan UI React.
2. **Kinerja Rendah Sumber Daya:** Tidak memerlukan container Docker atau runtime terpisah. Node.js berjalan efisien di PC server Windows.
3. **Kompatibilitas Laragon:** Memanfaatkan port MySQL bawaan Laragon (3306) tanpa perlu menginstal basis data terpisah.
