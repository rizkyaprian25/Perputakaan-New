/**
 * Bilik Baca - API Logout Pengguna
 * Menghapus record sesi di basis data dan membersihkan cookie peramban.
 */

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sesi } from "@/db/schema";
import { eq } from "drizzle-orm";
import { responSukses } from "@/lib/api-response";
import { hashTokenSesi, NAMA_COOKIE_SESI, ambilPenggunaDariSesi } from "@/lib/auth";
import { tulisLogAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(NAMA_COOKIE_SESI)?.value;
  const user = await ambilPenggunaDariSesi();

  if (token) {
    const tokenHash = hashTokenSesi(token);
    await db.delete(sesi).where(eq(sesi.tokenHash, tokenHash));

    if (user) {
      await tulisLogAudit({
        aktorId: user.id,
        aksi: "AUTH_LOGOUT",
        hasil: "sukses",
        meta: { username: user.username },
      });
    }
  }

  const respon = responSukses(null, "Sesi berhasil diakhiri");
  respon.cookies.delete("sid");
  respon.cookies.delete("__Host-sid");
  respon.cookies.delete(NAMA_COOKIE_SESI);
  return respon;
}
