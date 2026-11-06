/**
 * Bilik Baca - API Perpanjangan Masa Peminjaman Buku
 * Memperpanjang jatuh tempo peminjaman aktif sebanyak 1 kali (+lama_pinjam_hari)
 * selama buku belum melewati batas jatuh tempo.
 */

import { NextRequest } from "next/server";
import { pool } from "@/db";
import { PerpanjangPinjamSkema } from "@/contracts/skema";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  try {
    const body = await req.json();
    const parsed = PerpanjangPinjamSkema.safeParse(body);

    if (!parsed.success) {
      return responGalat(
        parsed.error.errors[0]?.message || "ID peminjaman tidak valid",
        400
      );
    }

    const { peminjamanId } = parsed.data;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Kunci baris peminjaman
      const [rows]: any = await connection.query(
        `SELECT p.id, p.jatuh_tempo, p.perpanjangan_ke, p.dikembalikan_pada,
                e.kode as kode_eksemplar, b.judul, a.nama as nama_peminjam
         FROM peminjaman p
         JOIN eksemplar e ON p.eksemplar_id = e.id
         JOIN buku b ON e.buku_id = b.id
         JOIN anggota a ON p.anggota_id = a.id
         WHERE p.id = ? FOR UPDATE`,
        [peminjamanId]
      );

      if (!rows || rows.length === 0) {
        await connection.rollback();
        return responGalat("Data transaksi peminjaman tidak ditemukan.", 404);
      }

      const pinjam = rows[0];

      if (pinjam.dikembalikan_pada) {
        await connection.rollback();
        return responGalat("Buku ini sudah dikembalikan.", 400);
      }

      if (Number(pinjam.perpanjangan_ke) >= 1) {
        await connection.rollback();
        return responGalat(
          "Batas perpanjangan tercapai. Buku hanya dapat diperpanjang maksimal 1 kali.",
          422
        );
      }

      const now = new Date();
      const jatuhTempoLama = new Date(pinjam.jatuh_tempo);
      if (now > jatuhTempoLama) {
        await connection.rollback();
        return responGalat(
          "Peminjaman yang sudah terlambat tidak dapat diperpanjang. Silakan kembalikan buku terlebih dahulu.",
          422
        );
      }

      // 2. Ambil durasi lama pinjam dari pengaturan
      const [rowsSettings]: any = await connection.query(
        "SELECT nilai FROM pengaturan WHERE kunci = 'lama_pinjam_hari' LIMIT 1"
      );
      const lamaPinjamHari =
        rowsSettings?.length > 0 ? Number(rowsSettings[0].nilai || 7) : 7;

      const jatuhTempoBaru = new Date(
        jatuhTempoLama.getTime() + lamaPinjamHari * 24 * 60 * 60 * 1000
      );

      // 3. Perbarui jatuh tempo dan perpanjangan_ke
      await connection.query(
        `UPDATE peminjaman 
         SET jatuh_tempo = ?, perpanjangan_ke = perpanjangan_ke + 1 
         WHERE id = ?`,
        [jatuhTempoBaru, peminjamanId]
      );

      // 4. Catat ke log audit
      await connection.query(
        `INSERT INTO log_audit (waktu, aktor_id, ip_anonim, aksi, objek_tipe, objek_id, hasil, meta)
         VALUES (NOW(), ?, '127.0.0.1', 'SIRKULASI_PERPANJANG_PINJAM', 'peminjaman', ?, 'sukses', ?)`,
        [
          auth.user.id,
          peminjamanId,
          JSON.stringify({
            kodeEksemplar: pinjam.kode_eksemplar,
            judul: pinjam.judul,
            namaPeminjam: pinjam.nama_peminjam,
            jatuhTempoLama: jatuhTempoLama.toISOString(),
            jatuhTempoBaru: jatuhTempoBaru.toISOString(),
          }),
        ]
      );

      await connection.commit();

      return responSukses(
        {
          peminjamanId,
          kodeEksemplar: pinjam.kode_eksemplar,
          judul: pinjam.judul,
          jatuhTempoBaru: jatuhTempoBaru.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        },
        `Masa pinjam '${pinjam.judul}' berhasil diperpanjang +${lamaPinjamHari} hari.`
      );
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Gagal memperpanjang peminjaman:", error);
    return responGalat("Terjadi kesalahan saat memproses perpanjangan buku", 500);
  }
}
