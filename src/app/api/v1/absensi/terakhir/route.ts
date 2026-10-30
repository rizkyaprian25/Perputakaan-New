/**
 * Bilik Baca - API Live Feed 5 Kedatangan Terakhir di Kiosk
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { kunjungan, anggota } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { responSukses, responGalat } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const hariIni = new Date().toISOString().slice(0, 10);

    const hasil = await db
      .select({
        id: kunjungan.id,
        nama: anggota.nama,
        kelas: anggota.kelas,
        waktu: kunjungan.waktu,
      })
      .from(kunjungan)
      .innerJoin(anggota, eq(kunjungan.anggotaId, anggota.id))
      .where(sql`${kunjungan.tanggal} = ${hariIni}`)
      .orderBy(desc(kunjungan.waktu))
      .limit(5);

    const dataFormatted = hasil.map((h) => ({
      id: h.id,
      nama: h.nama,
      kelas: h.kelas,
      jam: new Date(h.waktu).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    return responSukses(dataFormatted, "Feed kunjungan berhasil diambil");
  } catch (error) {
    console.error("Gagal mengambil feed kunjungan:", error);
    return responGalat("Terjadi kendala saat memuat feed kehadiran", 500);
  }
}
