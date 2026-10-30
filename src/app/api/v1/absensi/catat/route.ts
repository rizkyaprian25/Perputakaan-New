/**
 * Bilik Baca - API Pencatatan Presensi Kiosk Mandiri
 * Mendukung scan QR kartu siswa/guru dan input manual NIS/NIP.
 * Idempoten: Tidak membuat baris ganda jika siswa scan berulang kali dalam 1 hari.
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { anggota, kunjungan } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { responSukses, responGalat } from "@/lib/api-response";
import { AWALAN_QR } from "@/contracts/konstanta";
import { tulisLogAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawInput = String(body.input || "").trim();

    if (!rawInput) {
      return responGalat("Data pemindaian atau nomor induk tidak boleh kosong", 400);
    }

    let member = null;
    let metode: "qr" | "manual" = "manual";

    // 1. Cek apakah format QR Anggota: PUS1:A:<token>
    if (rawInput.startsWith(AWALAN_QR.ANGGOTA)) {
      const qrToken = rawInput.replace(AWALAN_QR.ANGGOTA, "").trim();
      metode = "qr";
      member = await db.query.anggota.findFirst({
        where: eq(anggota.qrToken, qrToken),
      });
    } else {
      // 2. Ketik Manual NIS / NIP
      metode = "manual";
      member = await db.query.anggota.findFirst({
        where: eq(anggota.nomorInduk, rawInput),
      });
    }

    // Jika anggota tidak ditemukan atau berstatus nonaktif
    if (!member || member.status !== "aktif") {
      await tulisLogAudit({
        aksi: "KIOSK_ABSENSI_DITOLAK",
        hasil: "gagal",
        meta: { input: rawInput, alasan: !member ? "tidak_terdaftar" : "nonaktif" },
      });
      return responGalat("Kartu atau nomor induk belum terdaftar di sistem perpustakaan.", 404);
    }

    const now = new Date();
    const tanggalHariIni = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const jamFormat = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // 3. Cek Idempotensi Kunjungan Hari Ini
    const kunjunganAda = await db.query.kunjungan.findFirst({
      where: and(
        eq(kunjungan.anggotaId, member.id),
        sql`${kunjungan.tanggal} = ${tanggalHariIni}`
      ),
    });

    if (kunjunganAda) {
      const jamLama = new Date(kunjunganAda.waktu).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return responSukses(
        {
          id: member.id,
          nama: member.nama,
          kelas: member.kelas,
          jam: jamLama,
          status: "sudah_absen",
        },
        `Kamu sudah tercatat hadir hari ini pukul ${jamLama} WIB.`
      );
    }

    // 4. Catat Kunjungan Baru
    const kunjunganId = ulid();
    await db.insert(kunjungan).values({
      id: kunjunganId,
      anggotaId: member.id,
      tanggal: now,
      waktu: now,
      metode,
      kioskLabel: "PC_KIOSK_1",
    });

    await tulisLogAudit({
      aktorId: member.id,
      aksi: "KIOSK_ABSENSI_TERCATAT",
      objekTipe: "kunjungan",
      objekId: kunjunganId,
      hasil: "sukses",
      meta: { nama: member.nama, kelas: member.kelas, metode },
    });

    return responSukses(
      {
        id: member.id,
        nama: member.nama,
        kelas: member.kelas,
        jam: jamFormat,
        status: "baru",
      },
      "Presensi berhasil dicatat"
    );
  } catch (error) {
    console.error("Gagal memproses presensi kiosk:", error);
    return responGalat("Terjadi kendala sistem saat memproses presensi", 500);
  }
}
