/**
 * Bilik Baca - API Pemeriksaan Sesi Pengguna Aktif
 */

import { NextRequest } from "next/server";
import { responSukses, responGalat } from "@/lib/api-response";
import { ambilPenggunaDariSesi } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await ambilPenggunaDariSesi();

  if (!user) {
    return responGalat("Belum terautentikasi", 401);
  }

  return responSukses(user, "Pengguna terautentikasi");
}
