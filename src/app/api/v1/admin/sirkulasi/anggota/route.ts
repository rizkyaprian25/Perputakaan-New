/**
 * Bilik Baca - API Pencarian Profil Anggota untuk Meja Sirkulasi
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { anggota, peminjaman, buku, eksemplar, pengaturan } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { responSukses, responGalat } from "@/lib/api-response";
import { AWALAN_QR } from "@/contracts/konstanta";
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

  let member = null;

  // Cek apakah scan kartu QR (PUS1:A:...)
  if (rawQ.startsWith(AWALAN_QR.ANGGOTA)) {
    const qrToken = rawQ.replace(AWALAN_QR.ANGGOTA, "").trim();
    member = await db.query.anggota.findFirst({
      where: eq(anggota.qrToken, qrToken),
    });
  } else {
    // Cari via Nomor Induk (NIS / NIP)
    member = await db.query.anggota.findFirst({
      where: eq(anggota.nomorInduk, rawQ),
    });
  }

  if (!member) {
    return responGalat("Anggota dengan kartu atau NIS/NIP tersebut tidak ditemukan.", 404);
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
