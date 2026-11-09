/**
 * Perpustakaan NETRI - API Pencatatan Presensi Kiosk Mandiri
 * Mendukung scan QR kartu siswa/guru (segala variasi huruf besar/kecil/simbol) dan input manual NIS/NIP/Nama.
 * Idempoten: Tidak membuat baris ganda jika siswa scan berulang kali dalam 1 hari.
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { anggota, kunjungan } from "@/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { responSukses, responGalat } from "@/lib/api-response";
import { tulisLogAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawInput = String(body.input || "").trim();

    if (!rawInput) {
      return responGalat("Data pemindaian atau nomor induk tidak boleh kosong", 400);
    }

    const adalahFormatQr = /^pus1[:;_-]a[:;_-]/i.test(rawInput);
    const inputBersih = rawInput.replace(/^pus1[:;_-]a[:;_-]/i, "").trim();

    // Cari anggota melalui qr_token, nomor_induk (NIS/NIP), atau id anggota
    let member = await db.query.anggota.findFirst({
      where: or(
        eq(anggota.qrToken, inputBersih),
        eq(anggota.nomorInduk, inputBersih),
        eq(anggota.id, inputBersih),
        eq(anggota.qrToken, rawInput),
        eq(anggota.nomorInduk, rawInput)
      ),
    });

    if (!member && inputBersih.length >= 2) {
      const qLower = inputBersih.toLowerCase();
      member = await db.query.anggota.findFirst({
        where: and(
          eq(anggota.status, "aktif"),
          or(
            sql`LOWER(${anggota.qrToken}) = ${qLower}`,
            sql`LOWER(${anggota.nomorInduk}) = ${qLower}`
          )
        ),
      });
    }

    const metode: "qr" | "manual" =
      adalahFormatQr || (member && member.qrToken.toLowerCase() === inputBersih.toLowerCase())
        ? "qr"
        : "manual";

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
