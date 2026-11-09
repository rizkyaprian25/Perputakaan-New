/**
 * Perpustakaan NETRI - API Agregasi Analitik & Komando Dashboard Eksekutif
 * Menyediakan statistik bulanan (12 bulan), tren harian (14 hari), rincian kondisi koleksi,
 * peringkat Duta Literasi (Top Buku, Top Siswa, Top Kelas), serta live feed operasional.
 */

import { NextRequest } from "next/server";
import { pool } from "@/db";
import { verifikasiAkses } from "@/lib/auth";
import { responSukses, responGalat } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const NAMA_BULAN_SINGKAT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const NAMA_BULAN_LENGKAP = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export async function GET(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { searchParams } = new URL(req.url);
  const tahunSekarang = new Date().getFullYear();
  const tahunParam = Number(searchParams.get("tahun") || tahunSekarang);
  const tahun =
    Number.isFinite(tahunParam) && tahunParam >= 2020 && tahunParam <= 2100
      ? tahunParam
      : tahunSekarang;

  const connection = await pool.getConnection();

  try {
    // 1. Ringkasan Koleksi & Kondisi Eksemplar Fisik
    const [koleksiRows]: any = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM buku WHERE dihapus_pada IS NULL) AS totalJudulBuku,
        COUNT(e.id) AS totalEksemplar,
        SUM(CASE WHEN e.status = 'tersedia' THEN 1 ELSE 0 END) AS eksemplarTersedia,
        SUM(CASE WHEN e.status = 'dipinjam' THEN 1 ELSE 0 END) AS eksemplarDipinjam,
        SUM(CASE WHEN e.status = 'rusak' THEN 1 ELSE 0 END) AS eksemplarRusak,
        SUM(CASE WHEN e.status = 'hilang' THEN 1 ELSE 0 END) AS eksemplarHilang
      FROM eksemplar e
      INNER JOIN buku b ON e.buku_id = b.id
      WHERE b.dihapus_pada IS NULL
    `);

    // 2. Ringkasan Keanggotaan Aktif
    const [anggotaRows]: any = await connection.query(`
      SELECT
        COUNT(*) AS totalAnggotaAktif,
        SUM(CASE WHEN jenis = 'siswa' THEN 1 ELSE 0 END) AS anggotaSiswa,
        SUM(CASE WHEN jenis IN ('guru', 'staf') THEN 1 ELSE 0 END) AS anggotaGuruStaf,
        COUNT(DISTINCT CASE WHEN kelas IS NOT NULL AND kelas != '' THEN kelas END) AS totalKelas
      FROM anggota
      WHERE status = 'aktif'
    `);

    // 3. Ringkasan Kunjungan Kiosk (Hari Ini, Minggu Ini, Bulan Ini, Tahun Dipilih)
    const [kunjunganRingkasanRows]: any = await connection.query(
      `
      SELECT
        SUM(CASE WHEN tanggal = CURDATE() THEN 1 ELSE 0 END) AS kunjunganHariIni,
        SUM(CASE WHEN YEARWEEK(tanggal, 1) = YEARWEEK(CURDATE(), 1) THEN 1 ELSE 0 END) AS kunjunganMingguIni,
        SUM(CASE WHEN YEAR(tanggal) = YEAR(CURDATE()) AND MONTH(tanggal) = MONTH(CURDATE()) THEN 1 ELSE 0 END) AS kunjunganBulanIni,
        SUM(CASE WHEN YEAR(tanggal) = ? THEN 1 ELSE 0 END) AS kunjunganTahunIni
      FROM kunjungan
      `,
      [tahun]
    );

    // 4. Ringkasan Sirkulasi Peminjaman & Kepatuhan
    const [sirkulasiRingkasanRows]: any = await connection.query(
      `
      SELECT
        SUM(CASE WHEN dikembalikan_pada IS NULL THEN 1 ELSE 0 END) AS sedangDipinjam,
        SUM(CASE WHEN dikembalikan_pada IS NULL AND jatuh_tempo < NOW() THEN 1 ELSE 0 END) AS terlambatAktif,
        SUM(CASE WHEN YEAR(dipinjam_pada) = YEAR(CURDATE()) AND MONTH(dipinjam_pada) = MONTH(CURDATE()) THEN 1 ELSE 0 END) AS pinjamBulanIni,
        SUM(CASE WHEN dikembalikan_pada IS NOT NULL AND YEAR(dikembalikan_pada) = YEAR(CURDATE()) AND MONTH(dikembalikan_pada) = MONTH(CURDATE()) THEN 1 ELSE 0 END) AS kembaliBulanIni,
        SUM(CASE WHEN YEAR(dipinjam_pada) = ? THEN 1 ELSE 0 END) AS totalTransaksiTahunIni,
        SUM(CASE WHEN dikembalikan_pada IS NOT NULL THEN 1 ELSE 0 END) AS totalSudahKembali,
        SUM(CASE WHEN dikembalikan_pada IS NOT NULL AND dikembalikan_pada <= jatuh_tempo THEN 1 ELSE 0 END) AS kembaliTepatWaktu,
        COALESCE(SUM(denda_rp), 0) AS totalDendaTerkumpulRp
      FROM peminjaman
      `,
      [tahun]
    );

    // 5. Statistik Bulanan (12 Bulan: Jan - Des pada tahun terpilih)
    const [kunjunganBulananRows]: any = await connection.query(
      `
      SELECT MONTH(tanggal) AS bulan, COUNT(*) AS total
      FROM kunjungan
      WHERE YEAR(tanggal) = ?
      GROUP BY MONTH(tanggal)
      `,
      [tahun]
    );

    const [pinjamBulananRows]: any = await connection.query(
      `
      SELECT MONTH(dipinjam_pada) AS bulan, COUNT(*) AS total
      FROM peminjaman
      WHERE YEAR(dipinjam_pada) = ?
      GROUP BY MONTH(dipinjam_pada)
      `,
      [tahun]
    );

    const [kembaliBulananRows]: any = await connection.query(
      `
      SELECT MONTH(dikembalikan_pada) AS bulan, COUNT(*) AS total
      FROM peminjaman
      WHERE dikembalikan_pada IS NOT NULL AND YEAR(dikembalikan_pada) = ?
      GROUP BY MONTH(dikembalikan_pada)
      `,
      [tahun]
    );

    const mapKunjunganBulan = new Map<number, number>();
    for (const r of kunjunganBulananRows || []) {
      mapKunjunganBulan.set(Number(r.bulan), Number(r.total));
    }
    const mapPinjamBulan = new Map<number, number>();
    for (const r of pinjamBulananRows || []) {
      mapPinjamBulan.set(Number(r.bulan), Number(r.total));
    }
    const mapKembaliBulan = new Map<number, number>();
    for (const r of kembaliBulananRows || []) {
      mapKembaliBulan.set(Number(r.bulan), Number(r.total));
    }

    const statistikBulanan = Array.from({ length: 12 }, (_, idx) => {
      const m = idx + 1;
      return {
        bulan: m,
        namaBulan: NAMA_BULAN_SINGKAT[idx],
        namaLengkap: NAMA_BULAN_LENGKAP[idx],
        kunjungan: mapKunjunganBulan.get(m) || 0,
        peminjaman: mapPinjamBulan.get(m) || 0,
        pengembalian: mapKembaliBulan.get(m) || 0,
      };
    });

    // 6. Statistik Harian (14 Hari Terakhir)
    const [kunjunganHarianRows]: any = await connection.query(`
      SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') AS tgl, COUNT(*) AS total
      FROM kunjungan
      WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
      GROUP BY DATE_FORMAT(tanggal, '%Y-%m-%d')
    `);

    const [pinjamHarianRows]: any = await connection.query(`
      SELECT DATE_FORMAT(dipinjam_pada, '%Y-%m-%d') AS tgl, COUNT(*) AS total
      FROM peminjaman
      WHERE dipinjam_pada >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
      GROUP BY DATE_FORMAT(dipinjam_pada, '%Y-%m-%d')
    `);

    const mapKunjunganHari = new Map<string, number>();
    for (const r of kunjunganHarianRows || []) {
      mapKunjunganHari.set(String(r.tgl), Number(r.total));
    }
    const mapPinjamHari = new Map<string, number>();
    for (const r of pinjamHarianRows || []) {
      mapPinjamHari.set(String(r.tgl), Number(r.total));
    }

    const namaHariSingkat = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const statistikHarian = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const iso = `${yyyy}-${mm}-${dd}`;
      return {
        tanggal: iso,
        label: `${dd} ${NAMA_BULAN_SINGKAT[d.getMonth()]}`,
        hari: namaHariSingkat[d.getDay()],
        kunjungan: mapKunjunganHari.get(iso) || 0,
        peminjaman: mapPinjamHari.get(iso) || 0,
      };
    });

    // 7. Komposisi Koleksi (Kelompok & Top Kategori)
    const [kelompokRows]: any = await connection.query(`
      SELECT
        k.kelompok,
        COUNT(DISTINCT b.id) AS jumlahJudul,
        COUNT(e.id) AS jumlahEksemplar
      FROM kategori k
      LEFT JOIN buku b ON b.kategori_id = k.id AND b.dihapus_pada IS NULL
      LEFT JOIN eksemplar e ON e.buku_id = b.id
      GROUP BY k.kelompok
    `);

    const [kategoriRows]: any = await connection.query(`
      SELECT
        k.id,
        k.nama,
        k.kelompok,
        COUNT(DISTINCT b.id) AS jumlahJudul,
        COUNT(e.id) AS jumlahEksemplar,
        SUM(CASE WHEN e.status = 'tersedia' THEN 1 ELSE 0 END) AS tersedia
      FROM kategori k
      LEFT JOIN buku b ON b.kategori_id = k.id AND b.dihapus_pada IS NULL
      LEFT JOIN eksemplar e ON e.buku_id = b.id
      GROUP BY k.id, k.nama, k.kelompok
      ORDER BY jumlahEksemplar DESC, jumlahJudul DESC
      LIMIT 6
    `);

    // 8. Peringkat Literasi: Top 5 Buku Terpopuler, Top 5 Siswa Duta Literasi, Top 5 Kelas Teraktif
    const [topBukuRows]: any = await connection.query(`
      SELECT
        b.id,
        b.judul,
        b.penulis,
        b.sampul_berkas AS sampulUrl,
        k.nama AS kategoriNama,
        k.kelompok,
        COUNT(p.id) AS totalDipinjam
      FROM buku b
      INNER JOIN kategori k ON b.kategori_id = k.id
      LEFT JOIN eksemplar e ON e.buku_id = b.id
      LEFT JOIN peminjaman p ON p.eksemplar_id = e.id
      WHERE b.dihapus_pada IS NULL
      GROUP BY b.id, b.judul, b.penulis, b.sampul_berkas, k.nama, k.kelompok
      ORDER BY totalDipinjam DESC, b.dibuat_pada DESC
      LIMIT 5
    `);

    const [topSiswaRows]: any = await connection.query(`
      SELECT
        a.id,
        a.nama,
        a.nomor_induk AS nomorInduk,
        a.kelas,
        a.jenis,
        (SELECT COUNT(*) FROM kunjungan kj WHERE kj.anggota_id = a.id) AS totalKunjungan,
        (SELECT COUNT(*) FROM peminjaman pm WHERE pm.anggota_id = a.id) AS totalPinjam
      FROM anggota a
      WHERE a.status = 'aktif'
      ORDER BY (
        (SELECT COUNT(*) FROM kunjungan kj WHERE kj.anggota_id = a.id) +
        (SELECT COUNT(*) FROM peminjaman pm WHERE pm.anggota_id = a.id) * 2
      ) DESC, a.nama ASC
      LIMIT 5
    `);

    const [topKelasRows]: any = await connection.query(`
      SELECT
        a.kelas,
        COUNT(DISTINCT a.id) AS jumlahAnggota,
        COUNT(DISTINCT kj.id) AS totalKunjungan,
        COUNT(DISTINCT pm.id) AS totalPinjam
      FROM anggota a
      LEFT JOIN kunjungan kj ON kj.anggota_id = a.id
      LEFT JOIN peminjaman pm ON pm.anggota_id = a.id
      WHERE a.status = 'aktif' AND a.kelas IS NOT NULL AND a.kelas != ''
      GROUP BY a.kelas
      ORDER BY (COUNT(DISTINCT kj.id) + COUNT(DISTINCT pm.id) * 2) DESC, a.kelas ASC
      LIMIT 5
    `);

    // 9. Peringatan Pinjaman Terlambat & Aktivitas Live Feed Terbaru
    const [rowsTerlambat]: any = await connection.query(`
      SELECT 
        p.id,
        p.jatuh_tempo AS jatuhTempo,
        p.perpanjangan_ke AS perpanjanganKe,
        a.nama AS namaAnggota,
        a.nomor_induk AS nomorInduk,
        a.kelas,
        e.kode AS kodeEksemplar,
        b.judul AS judulBuku
      FROM peminjaman p
      INNER JOIN anggota a ON p.anggota_id = a.id
      INNER JOIN eksemplar e ON p.eksemplar_id = e.id
      INNER JOIN buku b ON e.buku_id = b.id
      WHERE p.dikembalikan_pada IS NULL AND p.jatuh_tempo < NOW()
      ORDER BY p.jatuh_tempo ASC
      LIMIT 8
    `);

    const now = new Date();
    const pinjamanTerlambat = (rowsTerlambat || []).map((item: any) => {
      const jatuhTempoDate = new Date(item.jatuhTempo);
      const selisihHari = Math.max(
        1,
        Math.ceil((now.getTime() - jatuhTempoDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      return {
        ...item,
        selisihHari,
      };
    });

    const [sirkulasiTerbaruRows]: any = await connection.query(`
      SELECT 
        p.id,
        p.dipinjam_pada AS dipinjamPada,
        p.dikembalikan_pada AS dikembalikanPada,
        a.nama AS namaAnggota,
        a.kelas,
        e.kode AS kodeEksemplar,
        b.judul AS judulBuku
      FROM peminjaman p
      INNER JOIN anggota a ON p.anggota_id = a.id
      INNER JOIN eksemplar e ON p.eksemplar_id = e.id
      INNER JOIN buku b ON e.buku_id = b.id
      ORDER BY COALESCE(p.dikembalikan_pada, p.dipinjam_pada) DESC
      LIMIT 6
    `);

    const [kunjunganTerbaruRows]: any = await connection.query(`
      SELECT
        kj.id,
        kj.waktu,
        kj.metode,
        a.nama AS namaAnggota,
        a.nomor_induk AS nomorInduk,
        a.kelas
      FROM kunjungan kj
      INNER JOIN anggota a ON kj.anggota_id = a.id
      ORDER BY kj.waktu DESC
      LIMIT 6
    `);

    const kol = koleksiRows?.[0] || {};
    const ang = anggotaRows?.[0] || {};
    const knj = kunjunganRingkasanRows?.[0] || {};
    const srk = sirkulasiRingkasanRows?.[0] || {};

    const totalSudahKembali = Number(srk.totalSudahKembali || 0);
    const kembaliTepatWaktu = Number(srk.kembaliTepatWaktu || 0);
    const tingkatTepatWaktuPersen =
      totalSudahKembali > 0 ? Math.round((kembaliTepatWaktu / totalSudahKembali) * 100) : 100;

    const kelompokMap: Record<string, { judul: number; eksemplar: number }> = {
      pelajaran: { judul: 0, eksemplar: 0 },
      hiburan: { judul: 0, eksemplar: 0 },
    };
    for (const r of kelompokRows || []) {
      if (r.kelompok === "pelajaran" || r.kelompok === "hiburan") {
        kelompokMap[r.kelompok] = {
          judul: Number(r.jumlahJudul || 0),
          eksemplar: Number(r.jumlahEksemplar || 0),
        };
      }
    }

    return responSukses(
      {
        tahun,
        ringkasan: {
          totalJudulBuku: Number(kol.totalJudulBuku || 0),
          totalEksemplar: Number(kol.totalEksemplar || 0),
          eksemplarTersedia: Number(kol.eksemplarTersedia || 0),
          eksemplarDipinjam: Number(kol.eksemplarDipinjam || 0),
          eksemplarRusak: Number(kol.eksemplarRusak || 0),
          eksemplarHilang: Number(kol.eksemplarHilang || 0),
          totalAnggotaAktif: Number(ang.totalAnggotaAktif || 0),
          anggotaSiswa: Number(ang.anggotaSiswa || 0),
          anggotaGuruStaf: Number(ang.anggotaGuruStaf || 0),
          totalKelas: Number(ang.totalKelas || 0),
          kunjunganHariIni: Number(knj.kunjunganHariIni || 0),
          kunjunganMingguIni: Number(knj.kunjunganMingguIni || 0),
          kunjunganBulanIni: Number(knj.kunjunganBulanIni || 0),
          kunjunganTahunIni: Number(knj.kunjunganTahunIni || 0),
          sedangDipinjam: Number(srk.sedangDipinjam || 0),
          terlambatAktif: Number(srk.terlambatAktif || 0),
          pinjamBulanIni: Number(srk.pinjamBulanIni || 0),
          kembaliBulanIni: Number(srk.kembaliBulanIni || 0),
          totalTransaksiTahunIni: Number(srk.totalTransaksiTahunIni || 0),
          tingkatTepatWaktuPersen,
          totalDendaTerkumpulRp: Number(srk.totalDendaTerkumpulRp || 0),
        },
        statistikBulanan,
        statistikHarian,
        komposisiKoleksi: {
          kelompok: kelompokMap,
          perKategori: (kategoriRows || []).map((k: any) => ({
            id: k.id,
            nama: k.nama,
            kelompok: k.kelompok,
            jumlahJudul: Number(k.jumlahJudul || 0),
            jumlahEksemplar: Number(k.jumlahEksemplar || 0),
            tersedia: Number(k.tersedia || 0),
          })),
        },
        peringkatLiterasi: {
          topBuku: (topBukuRows || []).map((b: any) => ({
            id: b.id,
            judul: b.judul,
            penulis: b.penulis,
            sampulUrl: b.sampulUrl,
            kategoriNama: b.kategoriNama,
            kelompok: b.kelompok,
            totalDipinjam: Number(b.totalDipinjam || 0),
          })),
          topSiswa: (topSiswaRows || []).map((s: any) => ({
            id: s.id,
            nama: s.nama,
            nomorInduk: s.nomorInduk,
            kelas: s.kelas,
            jenis: s.jenis,
            totalKunjungan: Number(s.totalKunjungan || 0),
            totalPinjam: Number(s.totalPinjam || 0),
          })),
          topKelas: (topKelasRows || []).map((c: any) => ({
            kelas: c.kelas,
            jumlahAnggota: Number(c.jumlahAnggota || 0),
            totalKunjungan: Number(c.totalKunjungan || 0),
            totalPinjam: Number(c.totalPinjam || 0),
          })),
        },
        operasional: {
          pinjamanTerlambat,
          sirkulasiTerbaru: sirkulasiTerbaruRows || [],
          kunjunganTerbaru: kunjunganTerbaruRows || [],
        },
      },
      "Data analitik dashboard berhasil dimuat"
    );
  } catch (error) {
    console.error("Gagal memuat analitik dashboard:", error);
    return responGalat("Gagal memuat data analitik dashboard", 500);
  } finally {
    connection.release();
  }
}
