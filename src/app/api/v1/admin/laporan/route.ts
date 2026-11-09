/**
 * Perpustakaan NETRI - API Pusat Laporan, Rekapitulasi, & Peringkat Literasi
 * Menyediakan:
 * 1. Riwayat sirkulasi lengkap (filter rentang tanggal)
 * 2. Rekap kunjungan berdasarkan Kelas (total hadir, siswa unik, rasio partisipasi) & berdasarkan Siswa (individu + log kehadiran)
 * 3. Peringkat Buku Terpopuler, Peringkat Siswa Teraktif berdasarkan Peminjaman Buku, dan Peringkat Siswa Teraktif berdasarkan Kunjungan.
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
  const dari = (searchParams.get("dari") || "").trim();
  const sampai = (searchParams.get("sampai") || "").trim();

  try {
    // 1. Ambil tarif denda per hari
    const [rowsSettings]: any = await pool.query(
      "SELECT nilai FROM pengaturan WHERE kunci = 'denda_per_hari_rp' LIMIT 1"
    );
    const dendaPerHari = rowsSettings?.length > 0 ? Number(rowsSettings[0].nilai || 0) : 0;

    // Helper klausa filter tanggal untuk tabel peminjaman (p.dipinjam_pada) dan kunjungan (k.tanggal)
    let wherePinjam = "";
    const paramsPinjam: any[] = [];
    if (dari && sampai) {
      wherePinjam = " WHERE DATE(p.dipinjam_pada) BETWEEN ? AND ? ";
      paramsPinjam.push(dari, sampai);
    } else if (dari) {
      wherePinjam = " WHERE DATE(p.dipinjam_pada) >= ? ";
      paramsPinjam.push(dari);
    } else if (sampai) {
      wherePinjam = " WHERE DATE(p.dipinjam_pada) <= ? ";
      paramsPinjam.push(sampai);
    }

    let whereKunjungan = "";
    const paramsKunjungan: any[] = [];
    if (dari && sampai) {
      whereKunjungan = " WHERE DATE(k.tanggal) BETWEEN ? AND ? ";
      paramsKunjungan.push(dari, sampai);
    } else if (dari) {
      whereKunjungan = " WHERE DATE(k.tanggal) >= ? ";
      paramsKunjungan.push(dari);
    } else if (sampai) {
      whereKunjungan = " WHERE DATE(k.tanggal) <= ? ";
      paramsKunjungan.push(sampai);
    }

    // 2. Riwayat sirkulasi peminjaman
    const querySirkulasi = `
      SELECT 
        p.id,
        p.dipinjam_pada as dipinjamPada,
        p.jatuh_tempo as jatuhTempo,
        p.dikembalikan_pada as dikembalikanPada,
        p.perpanjangan_ke as perpanjanganKe,
        p.denda_rp as dendaRp,
        a.id as anggotaId,
        a.nama as namaAnggota,
        a.nomor_induk as nomorInduk,
        a.kelas,
        e.kode as kodeEksemplar,
        b.judul as judulBuku,
        b.penulis,
        kat.nama as kategoriNama,
        kat.kelompok
      FROM peminjaman p
      JOIN anggota a ON p.anggota_id = a.id
      JOIN eksemplar e ON p.eksemplar_id = e.id
      JOIN buku b ON e.buku_id = b.id
      JOIN kategori kat ON b.kategori_id = kat.id
      ${wherePinjam}
      ORDER BY p.dipinjam_pada DESC
      LIMIT 350
    `;
    const [rowsSirkulasi]: any = await pool.query(querySirkulasi, paramsPinjam);

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

    // 3. Peringkat Buku Terpopuler (Paling sering dipinjam)
    const [bukuPopuler]: any = await pool.query(
      `SELECT 
         b.id,
         b.judul,
         b.penulis,
         b.penerbit,
         b.lokasi_rak as lokasiRak,
         kat.nama as kategoriNama,
         kat.kelompok,
         COUNT(p.id) as totalPinjam,
         COUNT(DISTINCT p.anggota_id) as peminjamUnik,
         SUM(CASE WHEN p.dikembalikan_pada IS NULL THEN 1 ELSE 0 END) as sedangDipinjam
       FROM peminjaman p
       JOIN eksemplar e ON p.eksemplar_id = e.id
       JOIN buku b ON e.buku_id = b.id
       JOIN kategori kat ON b.kategori_id = kat.id
       ${wherePinjam}
       GROUP BY b.id, b.judul, b.penulis, b.penerbit, b.lokasi_rak, kat.nama, kat.kelompok
       ORDER BY totalPinjam DESC, peminjamUnik DESC
       LIMIT 25`,
      paramsPinjam
    );

    // 4. Peringkat Siswa Teraktif Berdasarkan Peminjaman Buku
    const [siswaAktifPinjam]: any = await pool.query(
      `SELECT 
         a.id,
         a.nama,
         a.nomor_induk as nomorInduk,
         COALESCE(NULLIF(a.kelas, ''), 'Umum') as kelas,
         a.jenis,
         COUNT(p.id) as totalPinjam,
         COUNT(DISTINCT e.buku_id) as judulUnik,
         SUM(CASE WHEN p.dikembalikan_pada IS NULL THEN 1 ELSE 0 END) as sedangDipinjam,
         SUM(CASE WHEN p.dikembalikan_pada IS NOT NULL THEN 1 ELSE 0 END) as selesaiDikembalikan,
         MAX(p.dipinjam_pada) as pinjamTerakhir,
         (SELECT COUNT(k2.id) FROM kunjungan k2 WHERE k2.anggota_id = a.id) as totalKunjungan
       FROM peminjaman p
       JOIN anggota a ON p.anggota_id = a.id
       JOIN eksemplar e ON p.eksemplar_id = e.id
       ${wherePinjam}
       GROUP BY a.id, a.nama, a.nomor_induk, a.kelas, a.jenis
       ORDER BY totalPinjam DESC, judulUnik DESC
       LIMIT 25`,
      paramsPinjam
    );

    // 5. Peringkat Siswa Teraktif Berdasarkan Kunjungan / Presensi Perpustakaan
    const [siswaAktifKunjungan]: any = await pool.query(
      `SELECT 
         a.id,
         a.nama,
         a.nomor_induk as nomorInduk,
         COALESCE(NULLIF(a.kelas, ''), 'Umum') as kelas,
         a.jenis,
         COUNT(k.id) as totalKunjungan,
         MAX(k.waktu) as kunjunganTerakhir,
         (SELECT COUNT(p2.id) FROM peminjaman p2 WHERE p2.anggota_id = a.id) as totalPinjam
       FROM kunjungan k
       JOIN anggota a ON k.anggota_id = a.id
       ${whereKunjungan}
       GROUP BY a.id, a.nama, a.nomor_induk, a.kelas, a.jenis
       ORDER BY totalKunjungan DESC, kunjunganTerakhir DESC
       LIMIT 25`,
      paramsKunjungan
    );

    // 6. Jumlah anggota aktif per kelas (untuk menghitung persentase partisipasi kelas)
    const [populasiKelasRows]: any = await pool.query(
      `SELECT COALESCE(NULLIF(kelas, ''), 'Umum') as namaKelas, COUNT(id) as jumlahAnggotaKelas
       FROM anggota
       WHERE status = 'aktif'
       GROUP BY namaKelas`
    );
    const mapPopulasiKelas = new Map<string, number>();
    for (const r of populasiKelasRows || []) {
      mapPopulasiKelas.set(String(r.namaKelas), Number(r.jumlahAnggotaKelas || 0));
    }

    // 7. Rekap Kunjungan Berdasarkan Kelas
    const [kunjunganKelasRows]: any = await pool.query(
      `SELECT 
         COALESCE(NULLIF(a.kelas, ''), 'Umum') as namaKelas,
         COUNT(k.id) as totalKunjungan,
         COUNT(DISTINCT k.anggota_id) as siswaUnik,
         MAX(k.waktu) as kunjunganTerakhir
       FROM kunjungan k
       JOIN anggota a ON k.anggota_id = a.id
       ${whereKunjungan}
       GROUP BY namaKelas
       ORDER BY totalKunjungan DESC, siswaUnik DESC`,
      paramsKunjungan
    );

    // Gabungkan dengan daftar kelas yang belum memiliki kunjungan agar semua kelas tetap terlihat di rekap
    const kelasSudahAda = new Set<string>();
    const kunjunganKelas = (kunjunganKelasRows || []).map((k: any) => {
      const namaKls = String(k.namaKelas || "Umum");
      kelasSudahAda.add(namaKls);
      const populasi = mapPopulasiKelas.get(namaKls) || Number(k.siswaUnik || 1);
      const siswaUnik = Number(k.siswaUnik || 0);
      const persenPartisipasi =
        populasi > 0 ? Math.min(100, Math.round((siswaUnik / populasi) * 100)) : 0;

      return {
        namaKelas: namaKls,
        totalKunjungan: Number(k.totalKunjungan || 0),
        siswaUnik,
        jumlahAnggotaKelas: populasi,
        persenPartisipasi,
        kunjunganTerakhir: k.kunjunganTerakhir || null,
      };
    });

    // 8. Rekap Kunjungan Berdasarkan Siswa (Akumulasi Per Individu Siswa)
    const [kunjunganSiswaRows]: any = await pool.query(
      `SELECT 
         a.id,
         a.nomor_induk as nomorInduk,
         a.nama,
         COALESCE(NULLIF(a.kelas, ''), 'Umum') as kelas,
         a.jenis,
         COUNT(k.id) as totalKunjungan,
         MAX(k.waktu) as kunjunganTerakhir,
         SUM(CASE WHEN k.metode = 'qr' THEN 1 ELSE 0 END) as viaQr,
         SUM(CASE WHEN k.metode = 'manual' THEN 1 ELSE 0 END) as viaManual,
         (SELECT COUNT(p3.id) FROM peminjaman p3 WHERE p3.anggota_id = a.id) as totalPinjamBuku
       FROM kunjungan k
       JOIN anggota a ON k.anggota_id = a.id
       ${whereKunjungan}
       GROUP BY a.id, a.nomor_induk, a.nama, a.kelas, a.jenis
       ORDER BY totalKunjungan DESC, kunjunganTerakhir DESC
       LIMIT 350`,
      paramsKunjungan
    );

    // 9. Log Riwayat Kehadiran Individual (Detail Presensi Waktu & Metode)
    const [riwayatKunjunganRows]: any = await pool.query(
      `SELECT 
         k.id,
         k.tanggal,
         k.waktu,
         k.metode,
         a.id as anggotaId,
         a.nomor_induk as nomorInduk,
         a.nama,
         COALESCE(NULLIF(a.kelas, ''), 'Umum') as kelas,
         a.jenis
       FROM kunjungan k
       JOIN anggota a ON k.anggota_id = a.id
       ${whereKunjungan}
       ORDER BY k.waktu DESC
       LIMIT 300`,
      paramsKunjungan
    );

    // 10. Rekap tren kunjungan harian (7 hari terakhir atau dalam rentang filter)
    const [trenKunjungan]: any = await pool.query(
      dari || sampai
        ? `SELECT DATE_FORMAT(k.tanggal, '%Y-%m-%d') as tanggal, COUNT(k.id) as total, COUNT(DISTINCT k.anggota_id) as siswaUnik
           FROM kunjungan k
           ${whereKunjungan}
           GROUP BY DATE_FORMAT(k.tanggal, '%Y-%m-%d')
           ORDER BY tanggal DESC
           LIMIT 14`
        : `SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') as tanggal, COUNT(id) as total, COUNT(DISTINCT anggota_id) as siswaUnik
           FROM kunjungan
           WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
           GROUP BY DATE_FORMAT(tanggal, '%Y-%m-%d')
           ORDER BY tanggal ASC`
    , paramsKunjungan);

    const daftarKelasTersedia = Array.from(mapPopulasiKelas.keys()).sort();

    return responSukses({
      filter: { dari, sampai },
      dendaPerHari,
      daftarKelasTersedia,
      totalTransaksi: sirkulasi.length,
      totalTerlambat: sirkulasi.filter((s: any) => s.terlambat).length,
      totalKunjunganPeriode: kunjunganKelas.reduce(
        (acc: number, item: any) => acc + item.totalKunjungan,
        0
      ),
      totalSiswaUnikBerkunjung: (kunjunganSiswaRows || []).length,
      sirkulasi,
      bukuPopuler: (bukuPopuler || []).map((b: any) => ({
        ...b,
        totalPinjam: Number(b.totalPinjam || 0),
        peminjamUnik: Number(b.peminjamUnik || 0),
        sedangDipinjam: Number(b.sedangDipinjam || 0),
      })),
      // Kompatibilitas mundur + struktur lengkap 2 peringkat siswa
      siswaAktif: (siswaAktifPinjam || []).map((s: any) => ({
        ...s,
        totalPinjam: Number(s.totalPinjam || 0),
        judulUnik: Number(s.judulUnik || 0),
        sedangDipinjam: Number(s.sedangDipinjam || 0),
        selesaiDikembalikan: Number(s.selesaiDikembalikan || 0),
        totalKunjungan: Number(s.totalKunjungan || 0),
      })),
      siswaAktifPinjam: (siswaAktifPinjam || []).map((s: any) => ({
        ...s,
        totalPinjam: Number(s.totalPinjam || 0),
        judulUnik: Number(s.judulUnik || 0),
        sedangDipinjam: Number(s.sedangDipinjam || 0),
        selesaiDikembalikan: Number(s.selesaiDikembalikan || 0),
        totalKunjungan: Number(s.totalKunjungan || 0),
      })),
      siswaAktifKunjungan: (siswaAktifKunjungan || []).map((s: any) => ({
        ...s,
        totalKunjungan: Number(s.totalKunjungan || 0),
        totalPinjam: Number(s.totalPinjam || 0),
      })),
      kunjunganKelas,
      kunjunganSiswa: (kunjunganSiswaRows || []).map((s: any) => ({
        ...s,
        totalKunjungan: Number(s.totalKunjungan || 0),
        viaQr: Number(s.viaQr || 0),
        viaManual: Number(s.viaManual || 0),
        totalPinjamBuku: Number(s.totalPinjamBuku || 0),
      })),
      riwayatKunjungan: riwayatKunjunganRows || [],
      trenKunjungan: (trenKunjungan || []).map((t: any) => ({
        tanggal: t.tanggal,
        total: Number(t.total || 0),
        siswaUnik: Number(t.siswaUnik || 0),
      })),
    });
  } catch (error) {
    console.error("Gagal mengambil laporan perpustakaan:", error);
    return responGalat("Terjadi kesalahan saat memuat data laporan", 500);
  }
}
