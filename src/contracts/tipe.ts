/**
 * Bilik Baca - Inferensi Tipe TypeScript (SSOT)
 * Seluruh tipe data aplikasi diturunkan langsung dari Zod Schema dan Konstanta.
 */

import { z } from "zod";
import {
  BukuBaruSkema,
  AnggotaBaruSkema,
  PinjamBukuSkema,
  KembaliBukuSkema,
  KategoriSkema,
  LoginSkema,
  BarisImporAnggotaSkema,
  ApiResponse,
} from "./skema";
import {
  KelompokKategori,
  StatusEksemplar,
  JenisAnggota,
  StatusAnggota,
  PeranPengguna,
  MetodeAbsensi,
  SumberBuku,
} from "./konstanta";

// Tipe model dasar dari Zod
export type BukuBaruInput = z.infer<typeof BukuBaruSkema>;
export type AnggotaBaruInput = z.infer<typeof AnggotaBaruSkema>;
export type PinjamBukuInput = z.infer<typeof PinjamBukuSkema>;
export type KembaliBukuInput = z.infer<typeof KembaliBukuSkema>;
export type KategoriInput = z.infer<typeof KategoriSkema>;
export type LoginInput = z.infer<typeof LoginSkema>;
export type BarisImporAnggota = z.infer<typeof BarisImporAnggotaSkema>;

// Tipe Entitas Lengkap (DTO / Domain Models)
export interface KategoriDTO {
  id: string;
  kelompok: KelompokKategori;
  nama: string;
  slug: string;
  jumlahBuku?: number;
}

export interface BukuDTO {
  id: string;
  isbn: string | null;
  judul: string;
  penulis: string;
  penerbit: string | null;
  tahunTerbit: number | null;
  jumlahHalaman: number | null;
  sinopsis: string | null;
  sampulBerkas: string | null;
  kategoriId: string;
  kategoriNama?: string;
  kelompok?: KelompokKategori;
  lokasiRak: string | null;
  sumber: SumberBuku;
  jumlahEksemplarTotal: number;
  jumlahTersedia: number;
  dibuatPada: string;
}

export interface EksemplarDTO {
  id: string;
  bukuId: string;
  kode: string;
  status: StatusEksemplar;
  dibuatPada: string;
}

export interface AnggotaDTO {
  id: string;
  nomorInduk: string;
  nama: string;
  jenis: JenisAnggota;
  kelas: string | null;
  qrToken: string;
  status: StatusAnggota;
  dibuatPada: string;
}

export interface PeminjamanDTO {
  id: string;
  anggotaId: string;
  anggotaNama: string;
  nomorInduk: string;
  eksemplarId: string;
  kodeEksemplar: string;
  bukuJudul: string;
  petugasId: string;
  petugasNama?: string;
  dipinjamPada: string;
  jatuhTempo: string;
  dikembalikanPada: string | null;
  terlambatHari: number;
}

export interface KunjunganDTO {
  id: string;
  anggotaId: string;
  nama: string;
  kelas: string | null;
  tanggal: string;
  waktu: string;
  metode: MetodeAbsensi;
}

export interface PenggunaSesiDTO {
  id: string;
  username: string;
  peran: PeranPengguna;
}

export interface PratinjauImporDTO {
  batchId: string;
  totalBaris: number;
  barisValid: number;
  barisBermasalah: number;
  duplikatDalamFile: number;
  duplikatDatabase: number;
  daftarError: Array<{ baris: number; alasan: string; data: Record<string, unknown> }>;
  dataValid: BarisImporAnggota[];
}

export type { ApiResponse };
