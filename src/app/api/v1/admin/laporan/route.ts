/**
 * Bilik Baca - API Pusat Laporan & Analitik Perpustakaan
 * Menyediakan riwayat sirkulasi lengkap, rekap kunjungan, buku terpopuler, dan siswa teraktif.
 */

import { NextRequest } from "next/server";
import { pool } from "@/db";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { searchParams } = new URL(req.url);
  const dari = searchParams.get("dari") || "";
  const sampai = searchParams.get("sampai") || "";

  try {
    // 1. Ambil tarif denda per hari
    const [rowsSettings]: any = await pool.query(
      "SELECT nilai FROM pengaturan WHERE kunci = 'denda_per_hari_rp' LIMIT 1"
    );
    const dendaPerHari = rowsSettings?.length > 0 ? Number(rowsSettings[0].nilai || 0) : 0;

    // 2. Riwayat sirkulasi peminjaman
    let querySirkulasi = `
      SELECT 
        p.id,
        p.dipinjam_pada as dipinjamPada,
        p.jatuh_tempo as jatuhTempo,
        p.dikembalikan_pada as dikembalikanPada,
        p.perpanjangan_ke as perpanjanganKe,
        p.denda_rp as dendaRp,
        a.nama as namaAnggota,
        a.nomor_induk as nomorInduk,
        a.kelas,
        e.kode as kodeEksemplar,
        b.judul as judulBuku,
        b.penulis
      FROM peminjaman p
      JOIN anggota a ON p.anggota_id = a.id
      JOIN eksemplar e ON p.eksemplar_id = e.id
      JOIN buku b ON e.buku_id = b.id
    `;
    const paramsSirkulasi: any[] = [];

    if (dari && sampai) {
      querySirkulasi += " WHERE DATE(p.dipinjam_pada) BETWEEN ? AND ?";
      paramsSirkulasi.push(dari, sampai);
    } else if (dari) {
      querySirkulasi += " WHERE DATE(p.dipinjam_pada) >= ?";
      paramsSirkulasi.push(dari);
    }

    querySirkulasi += " ORDER BY p.dipinjam_pada DESC LIMIT 200";

    const [rowsSirkulasi]: any = await pool.query(querySirkulasi, paramsSirkulasi);

    const now = new Date();
    const sirkulasi = (rowsSirkulasi || []).map((item: any) => {
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
        estimasiDendaRp: isAktif && terlambat ? selisihHari * dendaPerHari : Number(item.dendaRp || 0),
      };
    });

    // 3. Buku terpopuler (Paling sering dipinjam)
    const [bukuPopuler]: any = await pool.query(
      `SELECT b.id, b.judul, b.penulis, k.kelompok, COUNT(p.id) as totalPinjam
       FROM peminjaman p
       JOIN eksemplar e ON p.eksemplar_id = e.id
       JOIN buku b ON e.buku_id = b.id
       JOIN kategori k ON b.kategori_id = k.id
       GROUP BY b.id, b.judul, b.penulis, k.kelompok
       ORDER BY totalPinjam DESC
       LIMIT 10`
    );

    // 4. Siswa teraktif (Paling banyak membaca / meminjam)
    const [siswaAktif]: any = await pool.query(
      `SELECT a.id, a.nama, a.nomor_induk as nomorInduk, a.kelas, COUNT(p.id) as totalPinjam
       FROM peminjaman p
       JOIN anggota a ON p.anggota_id = a.id
       GROUP BY a.id, a.nama, a.nomor_induk, a.kelas
       ORDER BY totalPinjam DESC
       LIMIT 10`
    );

    // 5. Rekap kunjungan per kelas
    const [kunjunganKelas]: any = await pool.query(
      `SELECT COALESCE(NULLIF(a.kelas, ''), 'Umum') as namaKelas, COUNT(k.id) as totalKunjungan
       FROM kunjungan k
       JOIN anggota a ON k.anggota_id = a.id
       GROUP BY namaKelas
       ORDER BY totalKunjungan DESC`
    );

    // 6. Rekap tren kunjungan 7 hari terakhir
    const [trenKunjungan]: any = await pool.query(
      `SELECT tanggal, COUNT(id) as total
       FROM kunjungan
       WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY tanggal
       ORDER BY tanggal ASC`
    );

    return responSukses({
      filter: { dari, sampai },
      dendaPerHari,
      totalTransaksi: sirkulasi.length,
      totalTerlambat: sirkulasi.filter((s: any) => s.terlambat).length,
      sirkulasi,
      bukuPopuler: (bukuPopuler || []).map((b: any) => ({
        ...b,
        totalPinjam: Number(b.totalPinjam || 0),
      })),
      siswaAktif: (siswaAktif || []).map((s: any) => ({
        ...s,
        totalPinjam: Number(s.totalPinjam || 0),
      })),
      kunjunganKelas: (kunjunganKelas || []).map((k: any) => ({
        ...k,
        totalKunjungan: Number(k.totalKunjungan || 0),
      })),
      trenKunjungan: (trenKunjungan || []).map((t: any) => ({
        tanggal: t.tanggal,
        total: Number(t.total || 0),
      })),
    });
  } catch (error) {
    console.error("Gagal mengambil laporan perpustakaan:", error);
    return responGalat("Terjadi kesalahan saat memuat data laporan", 500);
  }
}
