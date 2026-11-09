/**
 * Perpustakaan NETRI - API Daftar Peminjaman Aktif & Pemantauan Keterlambatan
 * Mengambil seluruh transaksi buku yang sedang dipinjam (dikembalikan_pada IS NULL)
 * lengkap dengan perhitungan status terlambat dan estimasi denda.
 */

import { NextRequest } from "next/server";
import { pool } from "@/db";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  try {
    // 1. Ambil tarif denda per hari dari pengaturan
    const [rowsSettings]: any = await pool.query(
      "SELECT nilai FROM pengaturan WHERE kunci = 'denda_per_hari_rp' LIMIT 1"
    );
    const dendaPerHari = rowsSettings?.length > 0 ? Number(rowsSettings[0].nilai || 0) : 0;

    // 2. Ambil semua peminjaman aktif beserta detail siswa dan buku
    const [rows]: any = await pool.query(
      `SELECT 
         p.id,
         p.batch_id as batchId,
         p.dipinjam_pada as dipinjamPada,
         p.jatuh_tempo as jatuhTempo,
         p.perpanjangan_ke as perpanjanganKe,
         a.id as anggotaId,
         a.nama as namaAnggota,
         a.nomor_induk as nomorInduk,
         a.kelas,
         e.id as eksemplarId,
         e.kode as kodeEksemplar,
         b.id as bukuId,
         b.judul as judulBuku,
         b.penulis,
         b.lokasi_rak as lokasiRak
       FROM peminjaman p
       JOIN anggota a ON p.anggota_id = a.id
       JOIN eksemplar e ON p.eksemplar_id = e.id
       JOIN buku b ON e.buku_id = b.id
       WHERE p.dikembalikan_pada IS NULL
       ORDER BY p.jatuh_tempo ASC`
    );

    const now = new Date();
    const daftarPinjaman = (rows || []).map((item: any) => {
      const jatuhTempoDate = new Date(item.jatuhTempo);
      const terlambat = now > jatuhTempoDate;
      const selisihHari = terlambat
        ? Math.ceil((now.getTime() - jatuhTempoDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const sisaHari = !terlambat
        ? Math.ceil((jatuhTempoDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...item,
        terlambat,
        selisihHari,
        sisaHari,
        estimasiDendaRp: selisihHari * dendaPerHari,
      };
    });

    return responSukses({
      dendaPerHari,
      totalAktif: daftarPinjaman.length,
      totalTerlambat: daftarPinjaman.filter((p: any) => p.terlambat).length,
      daftarPinjaman,
    });
  } catch (error) {
    console.error("Gagal mengambil daftar peminjaman aktif:", error);
    return responGalat("Terjadi kesalahan saat memuat daftar peminjaman aktif", 500);
  }
}
