/**
 * Perpustakaan NETRI - Skema Validasi Runtime (Zod)
 * Validasi ketat batas data (System Boundaries) anti Mass-Assignment dan Injection.
 */

import { z } from "zod";
import {
  KELOMPOK_KATEGORI,
  STATUS_EKSEMPLAR,
  JENIS_ANGGOTA,
  STATUS_ANGGOTA,
  PERAN_PENGGUNA,
  METODE_ABSENSI,
  SUMBER_BUKU,
  BATAS,
} from "./konstanta";

// Pola nomor induk siswa (NIS) atau guru (NIP)
export const NomorIndukSkema = z
  .string({ required_error: "Nomor induk wajib diisi" })
  .trim()
  .min(4, "Nomor induk minimal 4 karakter")
  .max(25, "Nomor induk maksimal 25 karakter")
  .regex(/^[0-9A-Za-z.\-]+$/, "Nomor induk hanya boleh memuat huruf, angka, titik, atau strip");

// Format ULID baku (26 karakter alfanumerik Base32 Crockford)
export const UlidSkema = z
  .string()
  .length(26, "ID harus berupa ULID valid sepanjang 26 karakter");

// Normalisasi ISBN otomatis (menghapus strip dan spasi sebelum validasi ISBN-10 / ISBN-13)
export const IsbnSkema = z
  .string()
  .trim()
  .transform((val) => val.replace(/[- ]+/g, ""))
  .refine(
    (val) => val === "" || /^(97[89])?\d{9}[\dXx]$/.test(val),
    "Format ISBN tidak valid (harus 10 atau 13 digit angka ISBN)"
  )
  .optional();

// Skema Buku Baru (Input Form Tambah Buku)
export const BukuBaruSkema = z
  .object({
    isbn: IsbnSkema,
    judul: z
      .string({ required_error: "Judul buku wajib diisi" })
      .trim()
      .min(1, "Judul buku tidak boleh kosong")
      .max(300, "Judul buku maksimal 300 karakter"),
    penulis: z
      .string({ required_error: "Nama penulis wajib diisi" })
      .trim()
      .min(1, "Nama penulis tidak boleh kosong")
      .max(300, "Nama penulis maksimal 300 karakter"),
    penerbit: z.string().trim().max(200, "Penerbit maksimal 200 karakter").optional().or(z.literal("")),
    tahunTerbit: z
      .number({ invalid_type_error: "Tahun terbit harus berupa angka" })
      .int()
      .min(1800, "Tahun terbit minimal 1800")
      .max(2100, "Tahun terbit maksimal 2100")
      .optional()
      .nullable(),
    jumlahHalaman: z.number().int().min(1).max(10000).optional().nullable(),
    kategoriId: UlidSkema,
    sinopsis: z
      .string()
      .trim()
      .max(BATAS.SINOPSIS_MAKS_KARAKTER, "Sinopsis melebihi batas 5.000 karakter")
      .optional()
      .or(z.literal("")),
    sampulUrl: z.string().trim().max(255, "Path sampul maksimal 255 karakter").optional().nullable().or(z.literal("")),
    jumlahEksemplar: z
      .number({ required_error: "Jumlah eksemplar wajib diisi" })
      .int("Jumlah eksemplar harus bilangan bulat")
      .min(1, "Minimal harus ada 1 eksemplar")
      .max(BATAS.EKSEMPLAR_MAKS_PER_PENAMBAHAN, `Maksimal ${BATAS.EKSEMPLAR_MAKS_PER_PENAMBAHAN} eksemplar sekaligus`),
    lokasiRak: z.string().trim().max(50, "Lokasi rak maksimal 50 karakter").optional().or(z.literal("")),
    sumber: z
      .string()
      .optional()
      .transform((val): (typeof SUMBER_BUKU)[number] => {
        if (val === "google_books" || val === "open_library") return val;
        if (val === "kemendikbud_sibi" || val === "buku_indonesia") return "open_library";
        return "manual";
      })
      .default("manual"),
    idSumberEksternal: z.string().trim().max(100).optional().or(z.literal("")),
  })
  .strict();

// Skema Pembaruan Buku (Edit Buku)
export const BukuUpdateSkema = z
  .object({
    isbn: IsbnSkema,
    judul: z
      .string({ required_error: "Judul buku wajib diisi" })
      .trim()
      .min(1, "Judul buku tidak boleh kosong")
      .max(300, "Judul buku maksimal 300 karakter"),
    penulis: z
      .string({ required_error: "Nama penulis wajib diisi" })
      .trim()
      .min(1, "Nama penulis tidak boleh kosong")
      .max(300, "Nama penulis maksimal 300 karakter"),
    penerbit: z.string().trim().max(200).optional().or(z.literal("")),
    tahunTerbit: z.number().int().min(1800).max(2100).optional().nullable(),
    jumlahHalaman: z.number().int().min(1).max(10000).optional().nullable(),
    kategoriId: UlidSkema,
    sinopsis: z.string().trim().max(BATAS.SINOPSIS_MAKS_KARAKTER).optional().or(z.literal("")),
    sampulUrl: z.string().trim().max(255).optional().nullable().or(z.literal("")),
    lokasiRak: z.string().trim().max(50).optional().or(z.literal("")),
  })
  .strict();

// Skema Tambah Eksemplar Baru untuk Buku yang Sudah Ada
export const EksemplarTambahSkema = z
  .object({
    aksi: z.literal("tambah_eksemplar"),
    jumlah: z.number().int().min(1, "Minimal 1 eksemplar").max(100, "Maksimal 100 eksemplar per penambahan"),
  })
  .strict();

// Skema Ubah Status Kondisi Eksemplar
export const EksemplarUbahStatusSkema = z
  .object({
    aksi: z.literal("ubah_status"),
    eksemplarId: UlidSkema,
    status: z.enum(["tersedia", "rusak", "hilang"]),
  })
  .strict();

// Skema Anggota Baru
export const AnggotaBaruSkema = z
  .object({
    nomorInduk: NomorIndukSkema,
    nama: z
      .string({ required_error: "Nama anggota wajib diisi" })
      .trim()
      .min(2, "Nama minimal 2 karakter")
      .max(150, "Nama maksimal 150 karakter"),
    jenis: z.enum(JENIS_ANGGOTA, { required_error: "Jenis anggota wajib dipilih" }),
    kelas: z.string().trim().max(50, "Kelas maksimal 50 karakter").optional().or(z.literal("")),
  })
  .strict();

// Skema Edit Anggota
export const AnggotaUpdateSkema = z
  .object({
    nomorInduk: NomorIndukSkema,
    nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(150),
    jenis: z.enum(JENIS_ANGGOTA),
    kelas: z.string().trim().max(50).optional().or(z.literal("")),
    status: z.enum(STATUS_ANGGOTA),
  })
  .strict();

// Skema Absensi Mandiri di Kiosk (Scan QR Kartu)
export const QrAnggotaSkema = z
  .string({ required_error: "Payload QR wajib diisi" })
  .regex(/^PUS1:A:[A-Za-z0-9_-]{22}$/, "Format QR kartu anggota tidak valid atau tidak dikenali");

// Skema Absensi Mandiri di Kiosk (Ketik Manual NIS/NIP)
export const AbsensiManualSkema = z
  .object({
    nomorInduk: NomorIndukSkema,
  })
  .strict();

// Skema QR Eksemplar Buku
export const QrBukuSkema = z
  .string({ required_error: "Payload QR buku wajib diisi" })
  .regex(/^PUS1:B:[A-Z0-9-]{6,24}$/, "Format QR eksemplar buku tidak valid");

// Skema Transaksi Peminjaman Buku (Maksimal 5 buku per transaksi)
export const PinjamBukuSkema = z
  .object({
    anggotaId: UlidSkema,
    kodeEksemplar: z
      .array(z.string().regex(/^[A-Z0-9-]{6,24}$/, "Kode eksemplar tidak valid"))
      .min(1, "Minimal harus memilih 1 buku untuk dipinjam")
      .max(5, "Maksimal peminjaman 5 buku sekaligus dalam satu transaksi"),
    kunciIdempoten: z.string().uuid("Kunci idempoten harus berupa UUID").optional(),
  })
  .strict();

// Skema Pengembalian Buku
export const KembaliBukuSkema = z
  .object({
    kodeEksemplar: z
      .string({ required_error: "Kode eksemplar wajib diisi" })
      .regex(/^[A-Z0-9-]{6,24}$/, "Format kode eksemplar tidak valid"),
  })
  .strict();

// Skema Perpanjangan Peminjaman Buku
export const PerpanjangPinjamSkema = z
  .object({
    peminjamanId: UlidSkema,
  })
  .strict();

// Skema Kategori Buku
export const KategoriSkema = z
  .object({
    kelompok: z.enum(KELOMPOK_KATEGORI, { required_error: "Kelompok kategori wajib dipilih" }),
    nama: z
      .string({ required_error: "Nama kategori wajib diisi" })
      .trim()
      .min(2, "Nama kategori minimal 2 karakter")
      .max(100, "Nama kategori maksimal 100 karakter"),
  })
  .strict();

// Skema Pembaruan Pengaturan Sistem
export const PengaturanUpdateSkema = z
  .object({
    lamaPinjamHari: z.number().int().min(1).max(60),
    maksBukuPerAnggota: z.number().int().min(1).max(20),
    dendaPerHariRp: z.number().int().min(0).max(100000),
    namaPerpustakaan: z.string().trim().min(2).max(150).optional(),
  })
  .strict();

// Skema Autentikasi Login Admin / Petugas
export const LoginSkema = z
  .object({
    username: z
      .string({ required_error: "Username wajib diisi" })
      .trim()
      .min(3, "Username minimal 3 karakter")
      .max(50, "Username maksimal 50 karakter"),
    kataSandi: z
      .string({ required_error: "Kata sandi wajib diisi" })
      .min(8, "Kata sandi minimal 8 karakter")
      .max(100, "Kata sandi maksimal 100 karakter"),
  })
  .strict();

// Skema Baris Impor Anggota dari Excel/CSV
export const BarisImporAnggotaSkema = z.object({
  nomorInduk: NomorIndukSkema,
  nama: z.string().trim().min(2).max(150),
  jenis: z.enum(JENIS_ANGGOTA),
  kelas: z.string().trim().max(50).optional().default(""),
});

// Format Baku Respons API (ApiResponse)
export interface ApiResponse<T = unknown> {
  sukses: boolean;
  data: T | null;
  pesan: string;
  kodeStatus: number;
  errorId?: string;
}
