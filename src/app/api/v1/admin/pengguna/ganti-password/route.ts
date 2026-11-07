/**
 * Bilik Baca - API Ganti Kata Sandi Akun Pengguna Aktif
 * Memverifikasi kata sandi lama via Argon2id dan menyimpan hash baru yang aman.
 */

import { NextRequest } from "next/server";
import * as argon2 from "@node-rs/argon2";
import { db } from "@/db";
import { pengguna } from "@/db/schema";
import { eq } from "drizzle-orm";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";
import { tulisLogAudit } from "@/lib/audit";
import { z } from "zod";

const GantiPasswordSkema = z.object({
  passwordLama: z.string().min(1, "Kata sandi saat ini wajib diisi"),
  passwordBaru: z.string().min(8, "Kata sandi baru minimal 8 karakter").max(100),
});

export async function POST(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  try {
    const body = await req.json();
    const parsed = GantiPasswordSkema.safeParse(body);

    if (!parsed.success) {
      return responGalat(parsed.error.errors[0]?.message || "Data tidak valid", 400);
    }

    const { passwordLama, passwordBaru } = parsed.data;

    // 1. Ambil hash pengguna dari database
    const userDb = await db.query.pengguna.findFirst({
      where: eq(pengguna.id, auth.user.id),
    });

    if (!userDb) {
      return responGalat("Data pengguna tidak ditemukan", 404);
    }

    // 2. Verifikasi kata sandi lama
    const cocok = await argon2.verify(userDb.kataSandiHash, passwordLama);
    if (!cocok) {
      return responGalat("Kata sandi saat ini salah", 401);
    }

    // 3. Hash kata sandi baru
    const hashBaru = await argon2.hash(passwordBaru);

    // 4. Simpan ke database
    await db
      .update(pengguna)
      .set({
        kataSandiHash: hashBaru,
        gagalLogin: 0,
        terkunciHingga: null,
      })
      .where(eq(pengguna.id, auth.user.id));

    await tulisLogAudit({
      aktorId: auth.user.id,
      aksi: "AUTH_GANTI_PASSWORD",
      objekTipe: "pengguna",
      objekId: auth.user.id,
      hasil: "sukses",
    });

    return responSukses(null, "Kata sandi Anda berhasil diperbarui.");
  } catch (error) {
    console.error("Gagal mengganti kata sandi:", error);
    return responGalat("Terjadi kesalahan saat memproses ganti kata sandi", 500);
  }
}
