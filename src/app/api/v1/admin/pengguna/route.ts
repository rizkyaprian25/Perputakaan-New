/**
 * Perpustakaan NETRI - API Manajemen Akun Petugas Perpustakaan
 * Menampilkan daftar staf, menambah akun baru, dan mengubah status aktif.
 */

import { NextRequest } from "next/server";
import * as argon2 from "@node-rs/argon2";
import { db } from "@/db";
import { pengguna } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";
import { tulisLogAudit } from "@/lib/audit";
import { ulid } from "ulid";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TambahPenggunaSkema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh huruf, angka, titik, atau strip"),
  kataSandi: z.string().min(8, "Kata sandi minimal 8 karakter").max(100),
  peran: z.enum(["admin", "petugas"]),
});

export async function GET() {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  try {
    const list = await db
      .select({
        id: pengguna.id,
        username: pengguna.username,
        peran: pengguna.peran,
        aktif: pengguna.aktif,
        dibuatPada: pengguna.dibuatPada,
      })
      .from(pengguna)
      .orderBy(desc(pengguna.dibuatPada));

    return responSukses(list);
  } catch (error) {
    console.error("Gagal mengambil data pengguna:", error);
    return responGalat("Gagal memuat data akun staf", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifikasiAkses(["admin"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(
      auth.pesan || "Hanya administrator yang dapat membuat akun staf baru",
      auth.status || 403
    );
  }

  try {
    const body = await req.json();
    const parsed = TambahPenggunaSkema.safeParse(body);

    if (!parsed.success) {
      return responGalat(parsed.error.errors[0]?.message || "Data tidak valid", 400);
    }

    const { username, kataSandi, peran } = parsed.data;

    // Cek duplikasi username
    const existing = await db.query.pengguna.findFirst({
      where: eq(pengguna.username, username.toLowerCase()),
    });

    if (existing) {
      return responGalat(`Username '${username}' sudah digunakan`, 409);
    }

    const newId = ulid();
    const kataSandiHash = await argon2.hash(kataSandi);

    await db.insert(pengguna).values({
      id: newId,
      username: username.toLowerCase(),
      kataSandiHash,
      peran,
      aktif: true,
    });

    await tulisLogAudit({
      aktorId: auth.user.id,
      aksi: "PENGGUNA_TAMBAH",
      objekTipe: "pengguna",
      objekId: newId,
      hasil: "sukses",
      meta: { username: username.toLowerCase(), peran },
    });

    return responSukses(
      { id: newId, username: username.toLowerCase(), peran },
      `Akun staf '${username}' berhasil dibuat.`
    );
  } catch (error) {
    console.error("Gagal membuat akun staf:", error);
    return responGalat("Terjadi kesalahan saat membuat akun staf", 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifikasiAkses(["admin"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 403);
  }

  try {
    const body = await req.json();
    const { id, aktif } = body;

    if (!id || typeof aktif !== "boolean") {
      return responGalat("Parameter tidak lengkap", 400);
    }

    if (id === auth.user.id) {
      return responGalat("Anda tidak dapat mengubah status aktif akun Anda sendiri", 400);
    }

    await db.update(pengguna).set({ aktif }).where(eq(pengguna.id, id));

    await tulisLogAudit({
      aktorId: auth.user.id,
      aksi: "PENGGUNA_UBAH_STATUS",
      objekTipe: "pengguna",
      objekId: id,
      hasil: "sukses",
      meta: { aktif },
    });

    return responSukses(null, `Status akun berhasil diubah menjadi ${aktif ? "aktif" : "nonaktif"}.`);
  } catch (error) {
    console.error("Gagal mengubah status akun:", error);
    return responGalat("Terjadi kesalahan saat mengubah status akun", 500);
  }
}
