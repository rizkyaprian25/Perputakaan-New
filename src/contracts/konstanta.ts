/**
 * Bilik Baca - Kontrak Data & Single Source of Truth (SSOT)
 * Konstanta sistem, batasan bisnis, dan status enum baku.
 * Bahasa komentar: Bahasa Indonesia sesuai Master Engineering SOP.
 */

// Kelompok kategori utama perpustakaan (Hiburan vs Pelajaran)
export const KELOMPOK_KATEGORI = ["hiburan", "pelajaran"] as const;
export type KelompokKategori = (typeof KELOMPOK_KATEGORI)[number];

// Status fisik dari satu eksemplar buku
export const STATUS_EKSEMPLAR = ["tersedia", "dipinjam", "hilang", "rusak"] as const;
export type StatusEksemplar = (typeof STATUS_EKSEMPLAR)[number];

// Jenis keanggotaan perpustakaan
export const JENIS_ANGGOTA = ["siswa", "guru", "staf"] as const;
export type JenisAnggota = (typeof JENIS_ANGGOTA)[number];

// Status keaktifan anggota
export const STATUS_ANGGOTA = ["aktif", "nonaktif", "lulus"] as const;
export type StatusAnggota = (typeof STATUS_ANGGOTA)[number];

// Peran pengguna sistem terotentikasi (RBAC)
export const PERAN_PENGGUNA = ["admin", "petugas"] as const;
export type PeranPengguna = (typeof PERAN_PENGGUNA)[number];

// Metode pencatatan kunjungan di kiosk absensi
export const METODE_ABSENSI = ["qr", "manual"] as const;
export type MetodeAbsensi = (typeof METODE_ABSENSI)[number];

// Sumber perolehan metadata buku
export const SUMBER_BUKU = ["manual", "google_books", "open_library"] as const;
export type SumberBuku = (typeof SUMBER_BUKU)[number];

// Batas-batas operasional sistem (Defensive boundaries)
export const BATAS = {
  UKURAN_IMPOR_BYTE: 2 * 1024 * 1024, // Maksimal 2 Megabyte
  BARIS_IMPOR_MAKS: 2000, // Maksimal 2.000 baris per file impor
  UKURAN_SAMPUL_BYTE: 2 * 1024 * 1024, // Maksimal 2 Megabyte untuk file sampul
  EKSEMPLAR_MAKS_PER_PENAMBAHAN: 200, // Maksimal 200 eksemplar dalam sekali simpan
  SINOPSIS_MAKS_KARAKTER: 5000, // Panjang karakter sinopsis buku
  PINJAM_MAKS_BUKU_DEFAULT: 3, // Standar maksimal pinjam per anggota
  DURASI_PINJAM_HARI_DEFAULT: 7, // Standar batas peminjaman 7 hari
} as const;

// Kode awalan unik payload QR code
export const AWALAN_QR = {
  ANGGOTA: "PUS1:A:", // Format: PUS1:A:<token_22_karakter>
  BUKU: "PUS1:B:", // Format: PUS1:B:<kode_eksemplar>
} as const;
