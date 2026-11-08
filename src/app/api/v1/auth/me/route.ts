/**
 * Perpustakaan NETRI - API Pemeriksaan Sesi Pengguna Aktif
 */

import { NextRequest } from "next/server";
import { responSukses, responGalat } from "@/lib/api-response";
import { ambilPenggunaDariSesi, NAMA_COOKIE_SESI } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await ambilPenggunaDariSesi();

  if (!user) {
    const respon = responGalat("Belum terautentikasi", 401);
    respon.cookies.delete("sid");
    respon.cookies.delete("__Host-sid");
    respon.cookies.delete(NAMA_COOKIE_SESI);
    return respon;
  }

  return responSukses(user, "Pengguna terautentikasi");
}
