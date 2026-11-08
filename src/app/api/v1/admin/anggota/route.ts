/**
 * Perpustakaan NETRI - API Manajemen Anggota (Siswa & Guru)
 * Menambah anggota baru secara manual dan membangkitkan token QR unik.
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { anggota } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { AnggotaBaruSkema } from "@/contracts/skema";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";
import { ulid } from "ulid";
import crypto from "crypto";
import { tulisLogAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const dataAnggota = await db
    .select()
    .from(anggota)
    .where(
      q
        ? sql`${anggota.nama} LIKE ${`%${q}%`} OR ${anggota.nomorInduk} LIKE ${`%${q}%`}`
        : undefined
    )
    .orderBy(desc(anggota.dibuatPada));

  return responSukses(dataAnggota, "Daftar anggota berhasil diambil");
}

export async function POST(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const json = await req.json();
  const parse = AnggotaBaruSkema.safeParse(json);

  if (!parse.success) {
    return responGalat(parse.error.errors[0]?.message || "Data anggota tidak valid", 400);
  }

  const { nomorInduk, nama, jenis, kelas } = parse.data;

  // Cek apakah nomor induk sudah ada
  const existing = await db.query.anggota.findFirst({
    where: eq(anggota.nomorInduk, nomorInduk),
  });

  if (existing) {
    return responGalat(`Nomor induk '${nomorInduk}' sudah terdaftar atas nama ${existing.nama}.`, 409);
  }

  // Bangkitkan QR token unik (CSPRNG base64url 22 karakter)
  const qrToken = crypto.randomBytes(16).toString("base64url");
  const anggotaId = ulid();

  await db.insert(anggota).values({
    id: anggotaId,
    nomorInduk,
    nama,
    jenis,
    kelas: kelas || null,
    qrToken,
    status: "aktif",
  });

  await tulisLogAudit({
    aktorId: auth.user.id,
    aksi: "ANGGOTA_TAMBAH_MANUAL",
    objekTipe: "anggota",
    objekId: anggotaId,
    hasil: "sukses",
    meta: { nomorInduk, nama, jenis, kelas },
  });

  return responSukses(
    {
      id: anggotaId,
      nomorInduk,
      nama,
      jenis,
      kelas,
      qrPayload: `PUS1:A:${qrToken}`,
    },
    `Anggota '${nama}' berhasil ditambahkan ke sistem.`
  );
}
