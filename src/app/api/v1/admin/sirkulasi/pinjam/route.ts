/**
 * Bilik Baca - API Transaksi Peminjaman Buku (Jalur Kritis Atomik)
 * Menggunakan transaksi InnoDB MySQL dengan SELECT ... FOR UPDATE,
 * unique generated column aktif_eksemplar_id (anti race condition), dan audit log otomatis.
 */

import { NextRequest } from "next/server";
import { pool } from "@/db";
import { PinjamBukuSkema } from "@/contracts/skema";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";
import { ulid } from "ulid";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const json = await req.json();
  const parse = PinjamBukuSkema.safeParse(json);

  if (!parse.success) {
    return responGalat(
      parse.error.errors[0]?.message || "Payload peminjaman tidak valid",
      400
    );
  }

  const { anggotaId, kodeEksemplar, kunciIdempoten } = parse.data;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Kunci dan serialisasi data anggota (SELECT ... FOR UPDATE)
    const [rowsAnggota]: any = await connection.query(
      "SELECT id, nama, status FROM anggota WHERE id = ? FOR UPDATE",
      [anggotaId]
    );

    if (!rowsAnggota || rowsAnggota.length === 0) {
      await connection.rollback();
      return responGalat("Data anggota peminjam tidak ditemukan", 404);
    }

    const member = rowsAnggota[0];
    if (member.status !== "aktif") {
      await connection.rollback();
      return responGalat(`Anggota berstatus '${member.status}'. Tidak dapat meminjam.`, 403);
    }

    // 2. Ambil pengaturan sirkulasi (lama pinjam & batas maksimal buku)
    const [rowsSettings]: any = await connection.query(
      "SELECT kunci, nilai FROM pengaturan WHERE kunci IN ('lama_pinjam_hari', 'maks_buku_per_anggota')"
    );

    let lamaPinjamHari = 7;
    let maksBuku = 3;

    for (const s of rowsSettings) {
      if (s.kunci === "lama_pinjam_hari") lamaPinjamHari = Number(s.nilai || 7);
      if (s.kunci === "maks_buku_per_anggota") maksBuku = Number(s.nilai || 3);
    }

    // 3. Cek pinjaman aktif anggota dan keterlambatan
    const [rowsPinjamAktif]: any = await connection.query(
      "SELECT id, jatuh_tempo FROM peminjaman WHERE anggota_id = ? AND dikembalikan_pada IS NULL",
      [anggotaId]
    );

    const now = new Date();
    const adaTerlambat = rowsPinjamAktif.some(
      (p: any) => new Date(p.jatuh_tempo) < now
    );

    if (adaTerlambat) {
      await connection.rollback();
      return responGalat("Peminjaman ditolak: Siswa memiliki buku pinjaman yang terlambat.", 422);
    }

    const totalAkanDipinjam = rowsPinjamAktif.length + kodeEksemplar.length;
    if (totalAkanDipinjam > maksBuku) {
      await connection.rollback();
      return responGalat(
        `Peminjaman melebihi batas kuota. Siswa sedang meminjam ${rowsPinjamAktif.length} buku, batas maksimal adalah ${maksBuku} buku.`,
        422
      );
    }

    // 4. Urutkan kode eksemplar secara leksikografis (mencegah deadlock transaksi paralel)
    const sortedKodes = [...new Set(kodeEksemplar)].sort();
    const batchId = crypto.randomUUID();

    const dipinjamPada = new Date();
    const jatuhTempo = new Date(dipinjamPada.getTime() + lamaPinjamHari * 24 * 60 * 60 * 1000);

    const hasilPinjaman: Array<{ kode: string; judul: string; eksemplarId: string }> = [];

    // 5. Kunci setiap eksemplar dan simpan peminjaman
    for (const kode of sortedKodes) {
      const [rowsEksemplar]: any = await connection.query(
        `SELECT e.id, e.status, b.judul 
         FROM eksemplar e 
         JOIN buku b ON e.buku_id = b.id 
         WHERE e.kode = ? FOR UPDATE`,
        [kode]
      );

      if (!rowsEksemplar || rowsEksemplar.length === 0) {
        await connection.rollback();
        return responGalat(`Buku dengan kode eksemplar '${kode}' tidak ditemukan.`, 404);
      }

      const copy = rowsEksemplar[0];
      if (copy.status !== "tersedia") {
        await connection.rollback();
        return responGalat(
          `Buku '${copy.judul}' (${kode}) sedang berstatus '${copy.status}' dan tidak dapat dipinjam.`,
          409
        );
      }

      const peminjamanId = ulid();

      // INSERT ke peminjaman
      // Catatan: Stored generated column 'aktif_eksemplar_id' akan otomatis terisi nilai 'eksemplar_id'
      // dan menolak duplikasi secara level database (UQ constraint).
      await connection.query(
        `INSERT INTO peminjaman 
         (id, anggota_id, eksemplar_id, petugas_id, dipinjam_pada, jatuh_tempo, kunci_idempoten, batch_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          peminjamanId,
          anggotaId,
          copy.id,
          auth.user.id,
          dipinjamPada,
          jatuhTempo,
          kunciIdempoten || null,
          batchId,
        ]
      );

      // UPDATE status eksemplar menjadi 'dipinjam'
      await connection.query(
        "UPDATE eksemplar SET status = 'dipinjam' WHERE id = ?",
        [copy.id]
      );

      hasilPinjaman.push({
        kode,
        judul: copy.judul,
        eksemplarId: copy.id,
      });
    }

    // 6. Tulis log audit dalam transaksi yang sama
    await connection.query(
      `INSERT INTO log_audit (waktu, aktor_id, ip_anonim, aksi, objek_tipe, objek_id, hasil, meta) 
       VALUES (NOW(), ?, ?, 'SIRKULASI_PINJAM_BUKU', 'peminjaman_batch', ?, 'sukses', ?)`,
      [
        auth.user.id,
        "127.0.0.1",
        batchId,
        JSON.stringify({
          anggotaId,
          namaSiswa: member.nama,
          jumlahBuku: hasilPinjaman.length,
          daftarBuku: hasilPinjaman.map((b) => b.kode),
        }),
      ]
    );

    // Commit transaksi atomik
    await connection.commit();

    return responSukses(
      {
        batchId,
        namaPeminjam: member.nama,
        jumlahBuku: hasilPinjaman.length,
        dipinjamPada: dipinjamPada.toLocaleDateString("id-ID"),
        jatuhTempo: jatuhTempo.toLocaleDateString("id-ID"),
        daftarBuku: hasilPinjaman,
      },
      "Peminjaman buku berhasil dicatat secara resmi."
    );
  } catch (error: any) {
    await connection.rollback();
    console.error("Gagal transaksi peminjaman:", error);

    // Tangani kemungkinan duplikasi eksemplar aktif
    if (error.code === "ER_DUP_ENTRY") {
      return responGalat("Salah satu buku yang dipilih sedang dalam proses transaksi peminjaman lain.", 409);
    }

    return responGalat("Terjadi kesalahan sistem saat memproses peminjaman buku.", 500);
  } finally {
    connection.release();
  }
}
