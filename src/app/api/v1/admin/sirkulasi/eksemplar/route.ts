/**
 * Perpustakaan NETRI - API Pencarian Data Eksemplar Buku untuk Meja Sirkulasi
 * Mendukung pemindaian QR (PUS1:B:...), kode eksemplar (BB-000001 / 1), ID eksemplar, ISBN, maupun Judul Buku.
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { buku, eksemplar, kategori } from "@/db/schema";
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
  const rawKode = String(searchParams.get("kode") || "").trim();

  if (!rawKode) {
    return responGalat("Kode eksemplar atau scan QR tidak boleh kosong", 400);
  }

  // Tolak ramah jika pengguna memindai kartu QR anggota ke kolom buku
  if (/^pus1[:;_-]a[:;_-]/i.test(rawKode)) {
    return responGalat(
      "Kode yang dipindai adalah Kartu Anggota Siswa, bukan Stiker Buku.",
      400
    );
  }

  // Bersihkan awalan QR Buku (PUS1:B:, pus1:b:, PUS1;B;) dan normalisasi tanda hubung
  let kodeBersih = rawKode.replace(/^pus1[:;_-]b[:;_-]/i, "").trim();
  if (/^bb[_\s]\d+/i.test(kodeBersih)) {
    kodeBersih = kodeBersih.replace(/^bb[_\s]/i, "BB-").toUpperCase();
  }

  // Jika pengguna mengetik angka murni pendek (misal "1" atau "12"), siapkan juga kandidat "BB-000001"
  const kandidatPadding =
    /^\d{1,6}$/.test(kodeBersih) ? `BB-${kodeBersih.padStart(6, "0")}` : kodeBersih.toUpperCase();

  const selectFields = {
    eksemplarId: eksemplar.id,
    kode: eksemplar.kode,
    status: eksemplar.status,
    bukuId: buku.id,
    judul: buku.judul,
    penulis: buku.penulis,
    kategoriNama: kategori.nama,
    lokasiRak: buku.lokasiRak,
  };

  // 1. Cari eksemplar fisik buku berdasarkan kode eksemplar atau ID eksemplar
  let [dataEksemplar] = await db
    .select(selectFields)
    .from(eksemplar)
    .innerJoin(buku, eq(eksemplar.bukuId, buku.id))
    .innerJoin(kategori, eq(buku.kategoriId, kategori.id))
    .where(
      or(
        eq(eksemplar.kode, kodeBersih),
        eq(eksemplar.kode, kodeBersih.toUpperCase()),
        eq(eksemplar.kode, kandidatPadding),
        eq(eksemplar.id, kodeBersih),
        sql`LOWER(${eksemplar.kode}) = ${kodeBersih.toLowerCase()}`
      )
    )
    .limit(1);

  // 2. Jika belum ketemu, cek apakah pengguna memindai barcode ISBN atau mengetik judul buku
  if (!dataEksemplar && kodeBersih.length >= 3) {
    const qIsbn = kodeBersih.replace(/[-\s]+/g, "").toLowerCase();
    const qJudul = kodeBersih.toLowerCase();

    const daftarKandidat = await db
      .select(selectFields)
      .from(eksemplar)
      .innerJoin(buku, eq(eksemplar.bukuId, buku.id))
      .innerJoin(kategori, eq(buku.kategoriId, kategori.id))
      .where(
        and(
          sql`${buku.dihapusPada} IS NULL`,
          or(
            sql`REPLACE(REPLACE(LOWER( COALESCE(${buku.isbn}, '') ), '-', ''), ' ', '') = ${qIsbn}`,
            sql`LOWER(${buku.judul}) = ${qJudul}`,
            sql`LOWER(${buku.judul}) LIKE ${`%${qJudul}%`}`
          )
        )
      )
      .limit(10);

    if (daftarKandidat.length > 0) {
      // Prioritaskan eksemplar yang berstatus 'tersedia'
      dataEksemplar =
        daftarKandidat.find((k) => k.status === "tersedia") || daftarKandidat[0];
    }
  }

  if (!dataEksemplar) {
    return responGalat(
      `Buku dengan kode eksemplar, ISBN, atau judul '${kodeBersih}' tidak ditemukan.`,
      404
    );
  }

  const tersedia = dataEksemplar.status === "tersedia";

  return responSukses({
    eksemplarId: dataEksemplar.eksemplarId,
    kode: dataEksemplar.kode,
    status: dataEksemplar.status,
    judul: dataEksemplar.judul,
    penulis: dataEksemplar.penulis,
    kategoriNama: dataEksemplar.kategoriNama,
    lokasiRak: dataEksemplar.lokasiRak || "-",
    tersedia,
    alasanTolak: !tersedia ? `Buku ini sedang berstatus '${dataEksemplar.status}'.` : null,
  });
}
