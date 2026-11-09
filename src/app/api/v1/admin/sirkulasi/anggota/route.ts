/**
 * Perpustakaan NETRI - API Pencarian Profil Anggota untuk Meja Sirkulasi
 * Mendukung pemindaian QR (PUS1:A:...), token QR mentah, Nomor Induk (NIS/NIP), ID anggota, maupun Nama Siswa.
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { anggota, peminjaman, buku, eksemplar, pengaturan } from "@/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { searchParams } = new URL(req.url);
  const rawQ = String(searchParams.get("q") || "").trim();

  if (!rawQ) {
    return responGalat("Parameter pencarian anggota tidak boleh kosong", 400);
  }

  // Tolak ramah jika pengguna tanpa sengaja memindai stiker QR Buku ke kotak siswa
  if (/^pus1[:;_-]b[:;_-]/i.test(rawQ) || /^bb[-_]\d+/i.test(rawQ)) {
    return responGalat(
      "Kode yang dipindai adalah Stiker Buku. Silakan scan Kartu QR Siswa terlebih dahulu.",
      400
    );
  }

  // Bersihkan awalan QR anggota (misal PUS1:A:, pus1:a:, PUS1;A;) bila ada
  const qBersih = rawQ.replace(/^pus1[:;_-]a[:;_-]/i, "").trim();

  // 1. Cari kecocokan presisi pada qr_token, nomor_induk (NIS/NIP), atau id anggota
  let member = await db.query.anggota.findFirst({
    where: or(
      eq(anggota.qrToken, qBersih),
      eq(anggota.nomorInduk, qBersih),
      eq(anggota.id, qBersih),
      eq(anggota.qrToken, rawQ),
      eq(anggota.nomorInduk, rawQ)
    ),
  });

  // 2. Jika belum ketemu, cari berdasarkan kecocokan case-insensitive atau nama siswa aktif
  if (!member && qBersih.length >= 2) {
    const qLower = qBersih.toLowerCase();
    member = await db.query.anggota.findFirst({
      where: and(
        eq(anggota.status, "aktif"),
        or(
          sql`LOWER(${anggota.qrToken}) = ${qLower}`,
          sql`LOWER(${anggota.nomorInduk}) = ${qLower}`,
          sql`LOWER(${anggota.nama}) = ${qLower}`,
          sql`LOWER(${anggota.nama}) LIKE ${`%${qLower}%`}`
        )
      ),
    });
  }

  if (!member) {
    return responGalat("Anggota dengan kartu QR, NIS, atau nama tersebut tidak ditemukan.", 404);
  }

  if (member.status !== "aktif") {
    return responGalat(`Anggota ini berstatus '${member.status}'. Peminjaman tidak diizinkan.`, 403);
  }

  // Ambil daftar pinjaman yang sedang aktif
  const pinjamanAktif = await db
    .select({
      id: peminjaman.id,
      judul: buku.judul,
      kodeEksemplar: eksemplar.kode,
      dipinjamPada: peminjaman.dipinjamPada,
      jatuhTempo: peminjaman.jatuhTempo,
    })
    .from(peminjaman)
    .innerJoin(eksemplar, eq(peminjaman.eksemplarId, eksemplar.id))
    .innerJoin(buku, eq(eksemplar.bukuId, buku.id))
    .where(
      and(
        eq(peminjaman.anggotaId, member.id),
        sql`${peminjaman.dikembalikanPada} IS NULL`
      )
    );

  const now = new Date();
  const adaTerlambat = pinjamanAktif.some((p) => new Date(p.jatuhTempo) < now);

  // Ambil batas maksimal buku dari tabel pengaturan
  const settingMaks = await db.query.pengaturan.findFirst({
    where: eq(pengaturan.kunci, "maks_buku_per_anggota"),
  });
  const batasMaks = Number(settingMaks?.nilai || 3);

  const bolehPinjam = !adaTerlambat && pinjamanAktif.length < batasMaks;
  let alasanTolak = null;
  if (adaTerlambat) {
    alasanTolak = "Siswa memiliki buku pinjaman yang melewati batas jatuh tempo (terlambat).";
  } else if (pinjamanAktif.length >= batasMaks) {
    alasanTolak = `Siswa telah mencapai batas kuota maksimal (${batasMaks} buku).`;
  }

  return responSukses({
    anggota: {
      id: member.id,
      nama: member.nama,
      nomorInduk: member.nomorInduk,
      jenis: member.jenis,
      kelas: member.kelas,
      status: member.status,
    },
    totalPinjamAktif: pinjamanAktif.length,
    daftarPinjamAktif: pinjamanAktif.map((p) => ({
      ...p,
      dipinjamPada: new Date(p.dipinjamPada).toLocaleDateString("id-ID"),
      jatuhTempo: new Date(p.jatuhTempo).toLocaleDateString("id-ID"),
      terlambat: new Date(p.jatuhTempo) < now,
    })),
    batasMaks,
    adaTerlambat,
    bolehPinjam,
    alasanTolak,
  });
}
