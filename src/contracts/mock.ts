/**
 * Bilik Baca - Mock Data untuk Pengujian Kontrak (Mock & Fixture)
 * Digunakan untuk pengujian unit, visual preview, dan verifikasi SSOT tanpa koneksi DB hidup.
 */

import { KategoriDTO, BukuDTO, AnggotaDTO, PeminjamanDTO } from "./tipe";

export const MOCK_KATEGORI: KategoriDTO[] = [
  // Kelompok Hiburan
  { id: "01JMCB001NOVEL000000000001", kelompok: "hiburan", nama: "Novel", slug: "novel", jumlahBuku: 14 },
  { id: "01JMCB001KOMIK000000000002", kelompok: "hiburan", nama: "Komik", slug: "komik", jumlahBuku: 8 },
  { id: "01JMCB001CERPN000000000003", kelompok: "hiburan", nama: "Cerpen & Puisi", slug: "cerpen-puisi", jumlahBuku: 5 },
  { id: "01JMCB001BIOGF000000000004", kelompok: "hiburan", nama: "Biografi", slug: "biografi", jumlahBuku: 6 },
  { id: "01JMCB001SAINP000000000005", kelompok: "hiburan", nama: "Sains Populer", slug: "sains-populer", jumlahBuku: 11 },

  // Kelompok Pelajaran
  { id: "01JMCB002MTK00000000000001", kelompok: "pelajaran", nama: "Matematika", slug: "matematika", jumlahBuku: 25 },
  { id: "01JMCB002IPA00000000000002", kelompok: "pelajaran", nama: "Ilmu Pengetahuan Alam", slug: "ipa", jumlahBuku: 30 },
  { id: "01JMCB002IPS00000000000003", kelompok: "pelajaran", nama: "Ilmu Pengetahuan Sosial", slug: "ips", jumlahBuku: 20 },
  { id: "01JMCB002BIND0000000000004", kelompok: "pelajaran", nama: "Bahasa Indonesia", slug: "bahasa-indonesia", jumlahBuku: 22 },
  { id: "01JMCB002BING0000000000005", kelompok: "pelajaran", nama: "Bahasa Inggris", slug: "bahasa-inggris", jumlahBuku: 18 },
];

export const MOCK_BUKU: BukuDTO[] = [
  {
    id: "01JMCB010LASKAR000000000001",
    isbn: "9789793062792",
    judul: "Laskar Pelangi",
    penulis: "Andrea Hirata",
    penerbit: "Bentang Pustaka",
    tahunTerbit: 2005,
    jumlahHalaman: 529,
    sinopsis: "Kisah perjuangan sepuluh anak di Belitung dalam menempuh pendidikan di sekolah sederhana dengan semangat pantang menyerah.",
    sampulBerkas: null,
    kategoriId: "01JMCB001NOVEL000000000001",
    kategoriNama: "Novel",
    kelompok: "hiburan",
    lokasiRak: "R-01-A",
    sumber: "manual",
    jumlahEksemplarTotal: 5,
    jumlahTersedia: 3,
    dibuatPada: "2026-10-30T07:00:00Z",
  },
  {
    id: "01JMCB010BUMIMN000000000002",
    isbn: "9789799731234",
    judul: "Bumi Manusia",
    penulis: "Pramoedya Ananta Toer",
    penerbit: "Lentera Dipantara",
    tahunTerbit: 1980,
    jumlahHalaman: 535,
    sinopsis: "Roman sejarah tentang Minke, pemuda pribumi terpelajar di zaman kolonial Belanda, dan pergulatannya melawan ketidakadilan feodalisme.",
    sampulBerkas: null,
    kategoriId: "01JMCB001NOVEL000000000001",
    kategoriNama: "Novel",
    kelompok: "hiburan",
    lokasiRak: "R-01-B",
    sumber: "manual",
    jumlahEksemplarTotal: 4,
    jumlahTersedia: 4,
    dibuatPada: "2026-10-30T07:10:00Z",
  },
  {
    id: "01JMCB010MTK07000000000001",
    isbn: "9786022443456",
    judul: "Matematika untuk SMP/MTs Kelas VII",
    penulis: "Tim Kemendikbud",
    penerbit: "Kementerian Pendidikan dan Kebudayaan",
    tahunTerbit: 2021,
    jumlahHalaman: 312,
    sinopsis: "Buku teks utama mata pelajaran Matematika kurikulum merdeka kelas VII SMP/MTs.",
    sampulBerkas: null,
    kategoriId: "01JMCB002MTK00000000000001",
    kategoriNama: "Matematika",
    kelompok: "pelajaran",
    lokasiRak: "P-07-M",
    sumber: "manual",
    jumlahEksemplarTotal: 30,
    jumlahTersedia: 24,
    dibuatPada: "2026-10-30T07:20:00Z",
  },
];

export const MOCK_ANGGOTA: AnggotaDTO[] = [
  {
    id: "01JMCB020MHS00000000000001",
    nomorInduk: "202407001",
    nama: "Ahmad Fauzi",
    jenis: "siswa",
    kelas: "VII-A",
    qrToken: "PUS1:A:abcdef1234567890abcdef",
    status: "aktif",
    dibuatPada: "2026-10-30T07:00:00Z",
  },
  {
    id: "01JMCB020MHS00000000000002",
    nomorInduk: "202407002",
    nama: "Siti Rahmawati",
    jenis: "siswa",
    kelas: "VII-A",
    qrToken: "PUS1:A:uvwxyz1234567890uvwxyz",
    status: "aktif",
    dibuatPada: "2026-10-30T07:05:00Z",
  },
  {
    id: "01JMCB020GUR00000000000001",
    nomorInduk: "198501152010011005",
    nama: "Budi Santoso, S.Pd.",
    jenis: "guru",
    kelas: null,
    qrToken: "PUS1:A:guru1234567890abcdefgh",
    status: "aktif",
    dibuatPada: "2026-10-30T07:10:00Z",
  },
];
