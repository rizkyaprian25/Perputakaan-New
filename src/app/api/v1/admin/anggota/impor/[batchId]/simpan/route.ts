/**
 * Bilik Baca - API Simpan Impor Anggota Permanen (Langkah 2)
 * Memindahkan baris tervalidasi dari batch pratinjau ke tabel anggota dalam satu transaksi atomik.
 */

import { NextRequest } from "next/server";
import { pool, db } from "@/db";
import { imporBatch } from "@/db/schema";
import { eq } from "drizzle-orm";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";
import { ulid } from "ulid";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const auth = await verifikasiAkses(["admin"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak (Hanya Admin)", auth.status || 401);
  }

  const { batchId } = await params;

  // 1. Ambil data batch pratinjau
  const batch = await db.query.imporBatch.findFirst({
    where: eq(imporBatch.id, batchId),
  });

  if (!batch) {
    return responGalat("Sesi pratinjau impor tidak ditemukan atau sudah kedaluwarsa.", 404);
  }

  if (batch.status !== "pratinjau") {
    return responGalat(`Batch ini sudah berstatus '${batch.status}' dan tidak dapat diproses ulang.`, 400);
  }

  if (new Date(batch.kedaluwarsa) < new Date()) {
    await db.update(imporBatch).set({ status: "kedaluwarsa" }).where(eq(imporBatch.id, batchId));
    return responGalat("Sesi pratinjau impor telah kedaluwarsa (melebihi 30 menit). Unggah kembali berkas Anda.", 410);
  }

  const ringkasan: any = batch.ringkasan;
  const dataValid: any[] = ringkasan.dataValid || [];

  if (dataValid.length === 0) {
    return responGalat("Tidak ada data valid yang dapat disimpan dari berkas ini.", 400);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let jumlahTersimpan = 0;

    for (const item of dataValid) {
      const anggotaId = ulid();
      const qrToken = crypto.randomBytes(16).toString("base64url");

      await connection.query(
        `INSERT INTO anggota (id, nomor_induk, nama, jenis, kelas, qr_token, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'aktif')`,
        [anggotaId, item.nomorInduk, item.nama, item.jenis, item.kelas || null, qrToken]
      );
      jumlahTersimpan++;
    }

    // Update status batch menjadi 'tersimpan'
    await connection.query("UPDATE impor_batch SET status = 'tersimpan' WHERE id = ?", [batchId]);

    // Catat log audit
    await connection.query(
      `INSERT INTO log_audit (waktu, aktor_id, ip_anonim, aksi, objek_tipe, objek_id, hasil, meta)
       VALUES (NOW(), ?, '127.0.0.1', 'ANGGOTA_IMPOR_MASSAL_KOMIT', 'impor_batch', ?, 'sukses', ?)`,
      [
        auth.user.id,
        batchId,
        JSON.stringify({
          batchId,
          jumlahTersimpan,
        }),
      ]
    );

    await connection.commit();

    return responSukses(
      { batchId, jumlahTersimpan },
      `Berhasil menyimpan ${jumlahTersimpan} data anggota ke sistem perpustakaan.`
    );
  } catch (error) {
    await connection.rollback();
    console.error("Gagal menyimpan commit impor:", error);
    return responGalat("Terjadi kesalahan sistem saat menyimpan data anggota ke basis data.", 500);
  } finally {
    connection.release();
  }
}
