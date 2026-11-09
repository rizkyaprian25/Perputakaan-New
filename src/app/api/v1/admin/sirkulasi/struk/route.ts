/**
 * Perpustakaan NETRI - API Pengambilan Data Bukti / Struk Peminjaman Buku
 * Mengambil data peminjaman resmi berdasarkan ID peminjaman, Batch ID, atau Kode Eksemplar
 * lengkap dengan identitas siswa, daftar buku dalam transaksi tersebut, dan batas jatuh tempo.
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
  const id = searchParams.get("id")?.trim() || "";
  const batchId = searchParams.get("batchId")?.trim() || "";
  const eksemplarKode = searchParams.get("eksemplarKode")?.trim() || "";

  if (!id && !batchId && !eksemplarKode) {
    return responGalat("Parameter ID peminjaman, Batch ID, atau Kode Eksemplar wajib disertakan.", 400);
  }

  try {
    let rows: any[] = [];

    // 1. Jika ada Batch ID, ambil seluruh buku yang dipinjam bersamaan dalam batch tersebut
    if (batchId) {
      const [batchRows]: any = await pool.query(
        `SELECT 
           p.id,
           p.batch_id as batchId,
           p.dipinjam_pada as dipinjamPada,
           p.jatuh_tempo as jatuhTempo,
           p.dikembalikan_pada as dikembalikanPada,
           a.nama as namaPeminjam,
           a.nomor_induk as nomorInduk,
           a.kelas,
           e.kode as kodeEksemplar,
           b.judul as judulBuku,
           b.lokasi_rak as lokasiRak,
           COALESCE(u.username, 'Petugas Perpustakaan NETRI') as namaPetugas
         FROM peminjaman p
         JOIN anggota a ON p.anggota_id = a.id
         JOIN eksemplar e ON p.eksemplar_id = e.id
         JOIN buku b ON e.buku_id = b.id
         LEFT JOIN pengguna u ON p.petugas_id = u.id
         WHERE p.batch_id = ?
         ORDER BY e.kode ASC`,
        [batchId]
      );
      rows = batchRows;
    }

    // 2. Jika tidak ditemukan lewat batchId atau mencari spesifik lewat ID peminjaman
    if (rows.length === 0 && id) {
      // Ambil transaksi utama terlebih dahulu
      const [singleRows]: any = await pool.query(
        `SELECT 
           p.id,
           p.batch_id as batchId,
           p.anggota_id as anggotaId,
           p.dipinjam_pada as dipinjamPada,
           p.jatuh_tempo as jatuhTempo,
           p.dikembalikan_pada as dikembalikanPada,
           a.nama as namaPeminjam,
           a.nomor_induk as nomorInduk,
           a.kelas,
           e.kode as kodeEksemplar,
           b.judul as judulBuku,
           b.lokasi_rak as lokasiRak,
           COALESCE(u.username, 'Petugas Perpustakaan NETRI') as namaPetugas
         FROM peminjaman p
         JOIN anggota a ON p.anggota_id = a.id
         JOIN eksemplar e ON p.eksemplar_id = e.id
         JOIN buku b ON e.buku_id = b.id
         LEFT JOIN pengguna u ON p.petugas_id = u.id
         WHERE p.id = ?
         LIMIT 1`,
        [id]
      );

      if (singleRows.length > 0) {
        const target = singleRows[0];
        // Jika target memiliki batchId, ambil seluruh buku di batch tersebut
        if (target.batchId) {
          const [associatedRows]: any = await pool.query(
            `SELECT 
               p.id,
               p.batch_id as batchId,
               p.dipinjam_pada as dipinjamPada,
               p.jatuh_tempo as jatuhTempo,
               p.dikembalikan_pada as dikembalikanPada,
               a.nama as namaPeminjam,
               a.nomor_induk as nomorInduk,
               a.kelas,
               e.kode as kodeEksemplar,
               b.judul as judulBuku,
               b.lokasi_rak as lokasiRak,
               COALESCE(u.username, 'Petugas Perpustakaan NETRI') as namaPetugas
             FROM peminjaman p
             JOIN anggota a ON p.anggota_id = a.id
             JOIN eksemplar e ON p.eksemplar_id = e.id
             JOIN buku b ON e.buku_id = b.id
             LEFT JOIN pengguna u ON p.petugas_id = u.id
             WHERE p.batch_id = ?
             ORDER BY e.kode ASC`,
            [target.batchId]
          );
          rows = associatedRows.length > 0 ? associatedRows : singleRows;
        } else {
          rows = singleRows;
        }
      }
    }

    // 3. Jika mencari berdasarkan kode eksemplar
    if (rows.length === 0 && eksemplarKode) {
      const [byKodeRows]: any = await pool.query(
        `SELECT 
           p.id,
           p.batch_id as batchId,
           p.dipinjam_pada as dipinjamPada,
           p.jatuh_tempo as jatuhTempo,
           p.dikembalikan_pada as dikembalikanPada,
           a.nama as namaPeminjam,
           a.nomor_induk as nomorInduk,
           a.kelas,
           e.kode as kodeEksemplar,
           b.judul as judulBuku,
           b.lokasi_rak as lokasiRak,
           COALESCE(u.username, 'Petugas Perpustakaan NETRI') as namaPetugas
         FROM peminjaman p
         JOIN anggota a ON p.anggota_id = a.id
         JOIN eksemplar e ON p.eksemplar_id = e.id
         JOIN buku b ON e.buku_id = b.id
         LEFT JOIN pengguna u ON p.petugas_id = u.id
         WHERE e.kode = ?
         ORDER BY (p.dikembalikan_pada IS NULL) DESC, p.dipinjam_pada DESC
         LIMIT 1`,
        [eksemplarKode]
      );

      if (byKodeRows.length > 0) {
        const target = byKodeRows[0];
        if (target.batchId) {
          const [associatedRows]: any = await pool.query(
            `SELECT 
               p.id,
               p.batch_id as batchId,
               p.dipinjam_pada as dipinjamPada,
               p.jatuh_tempo as jatuhTempo,
               p.dikembalikan_pada as dikembalikanPada,
               a.nama as namaPeminjam,
               a.nomor_induk as nomorInduk,
               a.kelas,
               e.kode as kodeEksemplar,
               b.judul as judulBuku,
               b.lokasi_rak as lokasiRak,
               COALESCE(u.username, 'Petugas Perpustakaan NETRI') as namaPetugas
             FROM peminjaman p
             JOIN anggota a ON p.anggota_id = a.id
             JOIN eksemplar e ON p.eksemplar_id = e.id
             JOIN buku b ON e.buku_id = b.id
             LEFT JOIN pengguna u ON p.petugas_id = u.id
             WHERE p.batch_id = ?
             ORDER BY e.kode ASC`,
            [target.batchId]
          );
          rows = associatedRows.length > 0 ? associatedRows : byKodeRows;
        } else {
          rows = byKodeRows;
        }
      }
    }

    if (!rows || rows.length === 0) {
      return responGalat("Data transaksi peminjaman tidak ditemukan.", 404);
    }

    const first = rows[0];
    const dipinjamPadaDate = new Date(first.dipinjamPada);
    const jatuhTempoDate = new Date(first.jatuhTempo);

    const daftarBuku = rows.map((r) => ({
      kode: r.kodeEksemplar,
      judul: r.judulBuku,
      lokasiRak: r.lokasiRak || "-",
    }));

    return responSukses(
      {
        peminjamanId: first.id,
        batchId: first.batchId || first.id,
        namaPeminjam: first.namaPeminjam,
        nomorInduk: first.nomorInduk,
        kelas: first.kelas || "Umum",
        dipinjamPada: isNaN(dipinjamPadaDate.getTime())
          ? String(first.dipinjamPada)
          : dipinjamPadaDate.toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
        jatuhTempo: isNaN(jatuhTempoDate.getTime())
          ? String(first.jatuhTempo)
          : jatuhTempoDate.toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
        jumlahBuku: daftarBuku.length,
        daftarBuku,
        namaPetugas:
          first.namaPetugas && first.namaPetugas !== "admin"
            ? first.namaPetugas
            : "Petugas Perpustakaan NETRI",
        isAktif: !first.dikembalikanPada,
      },
      "Data struk peminjaman berhasil diambil."
    );
  } catch (error) {
    console.error("Gagal mengambil data struk peminjaman:", error);
    return responGalat("Terjadi kendala saat memuat data struk peminjaman.", 500);
  }
}
