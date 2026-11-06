/**
 * Bilik Baca - API Edit & Nonaktifkan Anggota Perpustakaan
 * Memungkinkan pembaruan data anggota (NIS, Nama, Jenis, Kelas, Status)
 * dan penghapusan/penonaktifan anggota jika tidak memiliki pinjaman aktif.
 */

import { NextRequest } from "next/server";
import { db, pool } from "@/db";
import { anggota } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { AnggotaUpdateSkema } from "@/contracts/skema";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";
import { tulisLogAudit } from "@/lib/audit";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = AnggotaUpdateSkema.safeParse(body);

    if (!parsed.success) {
      return responGalat(
        parsed.error.errors[0]?.message || "Data pembaruan anggota tidak valid",
        400
      );
    }

    const { nomorInduk, nama, jenis, kelas, status } = parsed.data;

    // 1. Cek apakah nomor induk bentrok dengan anggota lain
    const bentrok = await db
      .select({ id: anggota.id, nama: anggota.nama })
      .from(anggota)
      .where(and(eq(anggota.nomorInduk, nomorInduk), ne(anggota.id, id)))
      .limit(1);

    if (bentrok.length > 0) {
      return responGalat(
        `Nomor induk '${nomorInduk}' sudah dipakai oleh anggota lain (${bentrok[0].nama}).`,
        409
      );
    }

    // 2. Perbarui data anggota
    await db
      .update(anggota)
      .set({
        nomorInduk,
        nama,
        jenis,
        kelas: kelas || null,
        status,
      })
      .where(eq(anggota.id, id));

    await tulisLogAudit({
      aktorId: auth.user.id,
      aksi: "ANGGOTA_UPDATE",
      objekTipe: "anggota",
      objekId: id,
      hasil: "sukses",
      meta: { nomorInduk, nama, jenis, kelas, status },
    });

    return responSukses({ id }, `Data anggota '${nama}' berhasil diperbarui.`);
  } catch (error) {
    console.error("Gagal memperbarui anggota:", error);
    return responGalat("Terjadi kesalahan saat menyimpan perubahan anggota", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifikasiAkses(["admin"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Hanya admin yang dapat menghapus anggota", auth.status || 403);
  }

  const { id } = await context.params;

  try {
    // Cek apakah anggota masih memiliki buku yang belum dikembalikan
    const [rowsPinjam]: any = await pool.query(
      "SELECT COUNT(*) as total FROM peminjaman WHERE anggota_id = ? AND dikembalikan_pada IS NULL",
      [id]
    );

    if (rowsPinjam && Number(rowsPinjam[0]?.total || 0) > 0) {
      return responGalat(
        "Anggota tidak dapat dinonaktifkan/dihapus karena masih memiliki buku yang sedang dipinjam.",
        422
      );
    }

    // Ubah status menjadi nonaktif agar riwayat kunjungan/sirkulasi tetap terjaga
    await db
      .update(anggota)
      .set({ status: "nonaktif" })
      .where(eq(anggota.id, id));

    await tulisLogAudit({
      aktorId: auth.user.id,
      aksi: "ANGGOTA_NONAKTIFKAN",
      objekTipe: "anggota",
      objekId: id,
      hasil: "sukses",
    });

    return responSukses({ id }, "Status anggota berhasil diubah menjadi nonaktif.");
  } catch (error) {
    console.error("Gagal menonaktifkan anggota:", error);
    return responGalat("Terjadi kesalahan saat menonaktifkan anggota", 500);
  }
}
