/**
 * Bilik Baca - API Transaksi Pengembalian Buku
 * Mengubah status eksemplar menjadi 'tersedia' dan mencatat waktu pengembalian.
 */

import { NextRequest } from "next/server";
import { pool } from "@/db";
import { KembaliBukuSkema } from "@/contracts/skema";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";
import { AWALAN_QR } from "@/contracts/konstanta";

export async function POST(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const json = await req.json();
  const parse = KembaliBukuSkema.safeParse(json);

  if (!parse.success) {
    return responGalat(
      parse.error.errors[0]?.message || "Kode eksemplar tidak valid",
      400
    );
  }

  let kode = parse.data.kodeEksemplar.trim();
  if (kode.startsWith(AWALAN_QR.BUKU)) {
    kode = kode.replace(AWALAN_QR.BUKU, "").trim();
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Cari eksemplar dan pinjaman aktifnya
    const [rows]: any = await connection.query(
      `SELECT e.id as eksemplar_id, e.kode, b.judul, p.id as peminjaman_id, p.jatuh_tempo, a.nama as nama_peminjam, a.nomor_induk
       FROM eksemplar e
       JOIN buku b ON e.buku_id = b.id
       LEFT JOIN peminjaman p ON e.id = p.eksemplar_id AND p.dikembalikan_pada IS NULL
       LEFT JOIN anggota a ON p.anggota_id = a.id
       WHERE e.kode = ? FOR UPDATE`,
      [kode]
    );

    if (!rows || rows.length === 0) {
      await connection.rollback();
      return responGalat(`Eksemplar dengan kode '${kode}' tidak ditemukan.`, 404);
    }

    const item = rows[0];

    if (!item.peminjaman_id) {
      await connection.rollback();
      return responGalat(
        `Buku '${item.judul}' (${kode}) saat ini tidak dalam status dipinjam (sudah ada di rak).`,
        400
      );
    }

    const now = new Date();
    const jatuhTempo = new Date(item.jatuh_tempo);
    const terlambat = now > jatuhTempo;
    const selisihHari = terlambat
      ? Math.ceil((now.getTime() - jatuhTempo.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // 2. Update record peminjaman
    await connection.query(
      `UPDATE peminjaman 
       SET dikembalikan_pada = NOW(), petugas_kembali_id = ? 
       WHERE id = ?`,
      [auth.user.id, item.peminjaman_id]
    );

    // 3. Update status eksemplar menjadi 'tersedia'
    await connection.query(
      "UPDATE eksemplar SET status = 'tersedia' WHERE id = ?",
      [item.eksemplar_id]
    );

    // 4. Catat log audit
    await connection.query(
      `INSERT INTO log_audit (waktu, aktor_id, ip_anonim, aksi, objek_tipe, objek_id, hasil, meta)
       VALUES (NOW(), ?, '127.0.0.1', 'SIRKULASI_KEMBALI_BUKU', 'peminjaman', ?, 'sukses', ?)`,
      [
        auth.user.id,
        item.peminjaman_id,
        JSON.stringify({
          kodeEksemplar: kode,
          judul: item.judul,
          namaPeminjam: item.nama_peminjam,
          terlambat,
          selisihHari,
        }),
      ]
    );

    await connection.commit();

    return responSukses(
      {
        kodeEksemplar: kode,
        judul: item.judul,
        namaPeminjam: item.nama_peminjam,
        nomorInduk: item.nomor_induk,
        dikembalikanPada: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        terlambat,
        selisihHari,
      },
      "Buku berhasil dikembalikan dan status eksemplar telah tersedia."
    );
  } catch (error) {
    await connection.rollback();
    console.error("Gagal memproses pengembalian buku:", error);
    return responGalat("Terjadi kendala sistem saat memproses pengembalian.", 500);
  } finally {
    connection.release();
  }
}
