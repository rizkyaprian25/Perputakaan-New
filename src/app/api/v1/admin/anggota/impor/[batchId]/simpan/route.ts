/**
 * Perpustakaan NETRI - API Pratinjau Impor Data Anggota (Langkah 1)
 * Membaca berkas Excel/CSV, memvalidasi tiap baris dengan Zod, dan mendeteksi duplikasi.
 * BELUM menulis ke tabel anggota utama (aman dari kecelakaan data).
 */

import { NextRequest } from "next/server";
import readXlsxFile from "read-excel-file/node";
import { db } from "@/db";
import { anggota, imporBatch } from "@/db/schema";
import { BarisImporAnggotaSkema } from "@/contracts/skema";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";
import { ulid } from "ulid";
import { BATAS } from "@/contracts/konstanta";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await verifikasiAkses(["admin"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak (Hanya Admin)", auth.status || 401);
  }

  try {
    const formData = await req.formData();
    const file = formData.get("berkas") as File | null;

    if (!file) {
      return responGalat("Berkas Excel (.xlsx) atau CSV wajib diunggah", 400);
    }

    if (file.size > BATAS.UKURAN_IMPOR_BYTE) {
      return responGalat("Ukuran berkas melebihi batas maksimal 2 MB", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows: any[] = [];

    try {
      rows = await readXlsxFile(buffer);
    } catch (parseErr) {
      return responGalat("Format berkas tidak valid atau rusak. Pastikan berkas berformat .xlsx", 400);
    }

    if (!rows || rows.length <= 1) {
      return responGalat("Berkas kosong atau hanya memuat baris judul (header)", 400);
    }

    // Baris pertama diasumsikan header: nomor_induk, nama, jenis, kelas
    const dataRows = rows.slice(1);
    if (dataRows.length > BATAS.BARIS_IMPOR_MAKS) {
      return responGalat(`Jumlah baris melebihi batas maksimal ${BATAS.BARIS_IMPOR_MAKS} baris`, 400);
    }

    // Ambil semua nomor induk yang sudah ada di database untuk deteksi duplikat
    const allDbMembers = await db.select({ nomorInduk: anggota.nomorInduk }).from(anggota);
    const existingNisSet = new Set(allDbMembers.map((m) => m.nomorInduk.toLowerCase()));

    const seenInFile = new Set<string>();
    const dataValid: Array<{ nomorInduk: string; nama: string; jenis: "siswa" | "guru" | "staf"; kelas: string }> = [];
    const daftarError: Array<{ baris: number; alasan: string; data: Record<string, unknown> }> = [];

    let duplikatDalamFile = 0;
    let duplikatDatabase = 0;

    dataRows.forEach((row, index) => {
      const nomorBaris = index + 2; // Baris riil di Excel (mulai dari 2)
      const rawNis = String(row[0] || "").trim();
      const rawNama = String(row[1] || "").trim();
      let rawJenis = String(row[2] || "siswa").trim().toLowerCase();
      const rawKelas = String(row[3] || "").trim();

      if (!["siswa", "guru", "staf"].includes(rawJenis)) {
        rawJenis = "siswa";
      }

      // Validasi baris dengan Zod
      const parse = BarisImporAnggotaSkema.safeParse({
        nomorInduk: rawNis,
        nama: rawNama,
        jenis: rawJenis,
        kelas: rawKelas,
      });

      if (!parse.success) {
        daftarError.push({
          baris: nomorBaris,
          alasan: parse.error.errors[0]?.message || "Format data tidak valid",
          data: { nomorInduk: rawNis, nama: rawNama, jenis: rawJenis, kelas: rawKelas },
        });
        return;
      }

      const nisLower = rawNis.toLowerCase();

      // Cek duplikasi di dalam file itu sendiri
      if (seenInFile.has(nisLower)) {
        duplikatDalamFile++;
        daftarError.push({
          baris: nomorBaris,
          alasan: `Nomor induk '${rawNis}' duplikat di dalam berkas`,
          data: { nomorInduk: rawNis, nama: rawNama },
        });
        return;
      }
      seenInFile.add(nisLower);

      // Cek duplikasi terhadap basis data
      if (existingNisSet.has(nisLower)) {
        duplikatDatabase++;
        daftarError.push({
          baris: nomorBaris,
          alasan: `Nomor induk '${rawNis}' sudah ada di database`,
          data: { nomorInduk: rawNis, nama: rawNama },
        });
        return;
      }

      dataValid.push({
        nomorInduk: rawNis,
        nama: rawNama,
        jenis: rawJenis as "siswa" | "guru" | "staf",
        kelas: rawKelas,
      });
    });

    // Simpan hasil pratinjau di tabel impor_batch (kedaluwarsa dalam 30 menit)
    const batchId = ulid();
    const kedaluwarsa = new Date(Date.now() + 30 * 60 * 1000);

    const ringkasan = {
      totalBaris: dataRows.length,
      barisValid: dataValid.length,
      barisBermasalah: daftarError.length,
      duplikatDalamFile,
      duplikatDatabase,
      daftarError: daftarError.slice(0, 50), // Batasi 50 error pertama untuk payload
      dataValid,
    };

    await db.insert(imporBatch).values({
      id: batchId,
      penggunaId: auth.user.id,
      status: "pratinjau",
      ringkasan,
      kedaluwarsa,
    });

    return responSukses(
      {
        batchId,
        totalBaris: dataRows.length,
        barisValid: dataValid.length,
        barisBermasalah: daftarError.length,
        duplikatDalamFile,
        duplikatDatabase,
        daftarError: ringkasan.daftarError,
      },
      "Pratinjau impor berhasil diproses. Silakan tinjau sebelum disimpan permanen."
    );
  } catch (error) {
    console.error("Gagal memproses pratinjau impor:", error);
    return responGalat("Terjadi kendala saat membaca berkas impor", 500);
  }
}
