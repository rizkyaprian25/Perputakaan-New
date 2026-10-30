/**
 * Bilik Baca - Layanan Autentikasi & Pengelolaan Sesi (Server-Side Opaque Token)
 * Standar Keamanan 4: Argon2id, token acak CSPRNG 256-bit, hash SHA-256 tersimpan di DB.
 */

import crypto from "crypto";
import { db } from "@/db";
import { pengguna, sesi } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { PeranPengguna } from "@/contracts/konstanta";

// Pengaturan Cookie Sesi:
// Di server lokal/LAN sekolah HTTP, secure harus false dan nama cookie 'sid' agar tidak ditolak Chrome.
// Jika di hosting HTTPS publik, aktifkan COOKIE_SECURE=true untuk menyalakan __Host- prefix.
export const APAKAH_COOKIE_SECURE =
  process.env.COOKIE_SECURE === "true" ||
  (process.env.NODE_ENV === "production" && process.env.USE_HTTPS === "true");

export const NAMA_COOKIE_SESI = APAKAH_COOKIE_SECURE ? "__Host-sid" : "sid";

// Buat token acak CSPRNG (256-bit)
export function bangkitkanTokenSesi(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// Hash token sesi dengan SHA-256 sebelum disimpan ke database
export function hashTokenSesi(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Cek dan ambil data sesi pengguna aktif dari cookies
export async function ambilPenggunaDariSesi() {
  const cookieStore = await cookies();
  // Periksa kedua kemungkinan nama cookie agar kompatibel lintas lingkungan
  const token =
    cookieStore.get("sid")?.value ||
    cookieStore.get("__Host-sid")?.value ||
    cookieStore.get(NAMA_COOKIE_SESI)?.value;

  if (!token) return null;

  const tokenHash = hashTokenSesi(token);
  const now = new Date();

  // Query sesi aktif yang belum kedaluwarsa
  const [dataSesi] = await db
    .select({
      tokenHash: sesi.tokenHash,
      penggunaId: sesi.penggunaId,
      username: pengguna.username,
      peran: pengguna.peran,
      aktif: pengguna.aktif,
      kedaluwarsaIdle: sesi.kedaluwarsaIdle,
      kedaluwarsaAbsolut: sesi.kedaluwarsaAbsolut,
    })
    .from(sesi)
    .innerJoin(pengguna, eq(sesi.penggunaId, pengguna.id))
    .where(
      and(
        eq(sesi.tokenHash, tokenHash),
        eq(pengguna.aktif, true),
        sql`${sesi.kedaluwarsaIdle} > ${now}`,
        sql`${sesi.kedaluwarsaAbsolut} > ${now}`
      )
    );

  if (!dataSesi) return null;

  // Perpanjang idle timeout (sliding window) 30 menit ke depan
  const idleMinutes = Number(process.env.SESSION_IDLE_MINUTES || 30);
  const newIdle = new Date(Date.now() + idleMinutes * 60 * 1000);

  // Jangan perpanjang jika melebihi batas absolut
  if (newIdle < new Date(dataSesi.kedaluwarsaAbsolut)) {
    await db
      .update(sesi)
      .set({ kedaluwarsaIdle: newIdle })
      .where(eq(sesi.tokenHash, tokenHash));
  }

  return {
    id: dataSesi.penggunaId,
    username: dataSesi.username,
    peran: dataSesi.peran as PeranPengguna,
  };
}

// Verifikasi otorisasi RBAC (Role-Based Access Control)
export async function verifikasiAkses(peranDiizinkan: PeranPengguna[] = ["admin", "petugas"]) {
  const user = await ambilPenggunaDariSesi();
  if (!user) {
    return { diizinkan: false, status: 401, pesan: "Sesi tidak ditemukan atau telah berakhir" };
  }
  if (!peranDiizinkan.includes(user.peran)) {
    return { diizinkan: false, status: 403, pesan: "Anda tidak memiliki hak akses untuk tindakan ini" };
  }
  return { diizinkan: true, user };
}
