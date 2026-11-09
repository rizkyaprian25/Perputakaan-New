/**
 * Perpustakaan NETRI - API Riwayat Aktivitas Anggota (Sirkulasi & Kunjungan Kiosk)
 * Mengambil rekap buku yang sedang dipinjam, riwayat pengembalian, dan log kehadiran siswa.
 */

import { NextRequest } from "next/server";
import { db, pool } from "@/db";
import { anggota } from "@/db/schema";
import { eq } from "drizzle-orm";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { id } = await context.params;

  try {
    // 1. Ambil data anggota
    const [member] = await db
      .select()
      .from(anggota)
      .where(eq(anggota.id, id))
      .limit(1);

    if (!member) {
      return responGalat("Data anggota tidak ditemukan", 404);
    }

    // 2. Ambil riwayat peminjaman siswa
    const [rowsPinjam]: any = await pool.query(
      `SELECT 
         p.id,
         p.dipinjam_pada as dipinjamPada,
         p.jatuh_tempo as jatuhTempo,
         p.dikembalikan_pada as dikembalikanPada,
         p.perpanjangan_ke as perpanjanganKe,
         p.denda_rp as dendaRp,
         e.kode as kodeEksemplar,
         b.judul as judulBuku,
         b.penulis,
         b.lokasi_rak as lokasiRak
       FROM peminjaman p
       JOIN eksemplar e ON p.eksemplar_id = e.id
       JOIN buku b ON e.buku_id = b.id
       WHERE p.anggota_id = ?
       ORDER BY p.dipinjam_pada DESC
       LIMIT 30`,
      [id]
    );

    const now = new Date();
    const pinjaman = (rowsPinjam || []).map((item: any) => {
      const jatuhTempoDate = new Date(item.jatuhTempo);
      const isAktif = !item.dikembalikanPada;
      const terlambat = isAktif && now > jatuhTempoDate;
      const selisihHari = terlambat
        ? Math.ceil((now.getTime() - jatuhTempoDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...item,
        isAktif,
        terlambat,
        selisihHari,
      };
    });

    // 3. Ambil riwayat kunjungan kiosk
    const [rowsKunjungan]: any = await pool.query(
      `SELECT id, tanggal, waktu, metode, kiosk_label as kioskLabel
       FROM kunjungan
       WHERE anggota_id = ?
       ORDER BY waktu DESC
       LIMIT 20`,
      [id]
    );

    return responSukses({
      anggota: member,
      statistik: {
        totalDipinjam: pinjaman.filter((p: any) => p.isAktif).length,
        totalSelesai: pinjaman.filter((p: any) => !p.isAktif).length,
        totalKunjungan: rowsKunjungan?.length || 0,
      },
      riwayatPinjaman: pinjaman,
      riwayatKunjungan: rowsKunjungan || [],
    });
  } catch (error) {
    console.error("Gagal mengambil riwayat anggota:", error);
    return responGalat("Terjadi kesalahan saat memuat riwayat anggota", 500);
  }
}
