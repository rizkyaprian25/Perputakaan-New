/**
 * Perpustakaan NETRI - API Pencarian Data Eksemplar Buku untuk Meja Sirkulasi
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { buku, eksemplar, kategori } from "@/db/schema";
import { eq } from "drizzle-orm";
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
  let rawKode = String(searchParams.get("kode") || "").trim();

  if (!rawKode) {
    return responGalat("Kode eksemplar atau scan QR tidak boleh kosong", 400);
  }

  // Jika scan payload QR Buku: PUS1:B:<kode_eksemplar>
  if (rawKode.startsWith(AWALAN_QR.BUKU)) {
    rawKode = rawKode.replace(AWALAN_QR.BUKU, "").trim();
  }

  // Cari eksemplar fisik buku
  const [dataEksemplar] = await db
    .select({
      eksemplarId: eksemplar.id,
      kode: eksemplar.kode,
      status: eksemplar.status,
      bukuId: buku.id,
      judul: buku.judul,
      penulis: buku.penulis,
      kategoriNama: kategori.nama,
      lokasiRak: buku.lokasiRak,
    })
    .from(eksemplar)
    .innerJoin(buku, eq(eksemplar.bukuId, buku.id))
    .innerJoin(kategori, eq(buku.kategoriId, kategori.id))
    .where(eq(eksemplar.kode, rawKode));

  if (!dataEksemplar) {
    return responGalat(`Buku dengan kode eksemplar '${rawKode}' tidak ditemukan.`, 404);
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
