/**
 * Bilik Baca - API Daftar Kategori Buku
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { kategori } from "@/db/schema";
import { responSukses } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const dataKategori = await db.select().from(kategori);
  return responSukses(dataKategori, "Daftar kategori berhasil diambil");
}
