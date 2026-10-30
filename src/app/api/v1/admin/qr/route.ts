/**
 * Bilik Baca - API Pembangkitan Kode QR untuk Dicetak (Label Buku & Kartu Anggota)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eksemplar, anggota, buku } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buatQrSvg, buatPayloadQrAnggota, buatPayloadQrBuku } from "@/lib/qr";
import { verifikasiAkses } from "@/lib/auth";
import { responGalat } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { searchParams } = new URL(req.url);
  const tipe = searchParams.get("tipe"); // 'buku' atau 'anggota'
  const id = searchParams.get("id");

  if (!tipe || !id) {
    return responGalat("Parameter tipe ('buku'/'anggota') dan id wajib diisi", 400);
  }

  if (tipe === "buku") {
    // Cari eksemplar
    const copy = await db.query.eksemplar.findFirst({
      where: eq(eksemplar.id, id),
    });

    if (!copy) {
      return responGalat("Eksemplar buku tidak ditemukan", 404);
    }

    const payload = buatPayloadQrBuku(copy.kode);
    const svg = await buatQrSvg(payload);

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  if (tipe === "anggota") {
    const member = await db.query.anggota.findFirst({
      where: eq(anggota.id, id),
    });

    if (!member) {
      return responGalat("Data anggota tidak ditemukan", 404);
    }

    const payload = buatPayloadQrAnggota(member.qrToken);
    const svg = await buatQrSvg(payload);

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  return responGalat("Tipe tidak didukung", 400);
}
