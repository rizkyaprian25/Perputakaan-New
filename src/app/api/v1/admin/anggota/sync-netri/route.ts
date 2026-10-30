/**
 * Bilik Baca - API Sinkronisasi Siswa dari Netri SMS (Supabase Cloud)
 * Menarik master data siswa dan kelas secara otomatis, memperbarui status siswa lulus/keluar,
 * dan membangkitkan kartu QR bagi siswa baru tanpa menghapus riwayat peminjaman lama.
 */

import { NextRequest } from "next/server";
import { pool, db } from "@/db";
import { anggota } from "@/db/schema";
import { eq } from "drizzle-orm";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";
import { ulid } from "ulid";
import crypto from "crypto";
import { tulisLogAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

interface NetriClass {
  id: string;
  name: string;
}

interface NetriStudent {
  id: string;
  class_id: string | null;
  nis: string | null;
  full_name: string;
  gender: string | null;
  is_active: boolean;
}

export async function POST(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const supabaseUrl = process.env.NETRI_SUPABASE_URL;
  const supabaseKey = process.env.NETRI_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return responGalat(
      "Konfigurasi NETRI_SUPABASE_URL atau NETRI_SUPABASE_KEY belum terpasang di server.",
      500
    );
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Accept: "application/json",
  };

  try {
    // 1. Tarik Kamus Data Kelas dari Netri SMS
    const resClasses = await fetch(`${supabaseUrl}/rest/v1/classes?select=id,name`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!resClasses.ok) {
      throw new Error(`Gagal mengambil data kelas dari Netri SMS (HTTP ${resClasses.status})`);
    }

    const classesData: NetriClass[] = await resClasses.json();
    const classMap = new Map<string, string>();
    classesData.forEach((c) => {
      if (c.id && c.name) classMap.set(c.id, c.name);
    });

    // 2. Tarik Seluruh Siswa dari Netri SMS (Batas 5.000 siswa per tarikan)
    const resStudents = await fetch(
      `${supabaseUrl}/rest/v1/students?select=id,class_id,nis,full_name,gender,is_active&limit=5000`,
      {
        headers,
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!resStudents.ok) {
      throw new Error(`Gagal mengambil data siswa dari Netri SMS (HTTP ${resStudents.status})`);
    }

    const studentsData: NetriStudent[] = await resStudents.json();

    if (!Array.isArray(studentsData) || studentsData.length === 0) {
      return responSukses(
        { totalDitarik: 0, baru: 0, diperbarui: 0, dinonaktifkan: 0 },
        "Tidak ada data siswa yang ditemukan di Netri SMS."
      );
    }

    // 3. Deduplikasi siswa berdasarkan NIS (Prioritaskan record dengan is_active = true)
    const studentsByNis = new Map<string, NetriStudent>();
    for (const s of studentsData) {
      const rawNis = (s.nis || "").trim();
      if (!rawNis) continue;
      const key = rawNis.toLowerCase();
      const existingCandidate = studentsByNis.get(key);
      if (!existingCandidate) {
        studentsByNis.set(key, s);
      } else {
        // Prioritaskan status aktif jika terjadi duplikasi record kelas
        if (!existingCandidate.is_active && s.is_active) {
          studentsByNis.set(key, s);
        }
      }
    }

    // 4. Ambil seluruh data anggota yang ada di MySQL Laragon untuk pencocokan cepat
    const localMembers = await db
      .select({
        id: anggota.id,
        nomorInduk: anggota.nomorInduk,
        nama: anggota.nama,
        kelas: anggota.kelas,
        status: anggota.status,
      })
      .from(anggota)
      .where(eq(anggota.jenis, "siswa"));

    const localMap = new Map<string, (typeof localMembers)[0]>();
    localMembers.forEach((m) => {
      localMap.set(m.nomorInduk.toLowerCase(), m);
    });

    // 4. Proses Sinkronisasi & Transaksi Atomik
    const connection = await pool.getConnection();
    let totalBaru = 0;
    let totalDiperbarui = 0;
    let totalDinonaktifkan = 0;

    try {
      await connection.beginTransaction();

      for (const s of studentsByNis.values()) {
        const rawNis = (s.nis || "").trim();
        if (!rawNis) continue; // Abaikan siswa tanpa NIS

        const namaBersih = (s.full_name || "Siswa Tanpa Nama").trim();
        const namaKelas = s.class_id ? classMap.get(s.class_id) || s.class_id : null;
        const targetStatus: "aktif" | "nonaktif" = s.is_active ? "aktif" : "nonaktif";

        const existing = localMap.get(rawNis.toLowerCase());

        if (!existing) {
          // Siswa Baru: Tambahkan dan bangkitkan token QR unik
          const anggotaId = ulid();
          const qrToken = crypto.randomBytes(16).toString("base64url");

          await connection.query(
            `INSERT INTO anggota (id, nomor_induk, nama, jenis, kelas, qr_token, status) 
             VALUES (?, ?, ?, 'siswa', ?, ?, ?)`,
            [anggotaId, rawNis, namaBersih, namaKelas, qrToken, targetStatus]
          );

          totalBaru++;
          if (targetStatus === "nonaktif") totalDinonaktifkan++;
        } else {
          // Siswa Sudah Ada: Cek apakah ada perubahan nama, kelas, atau status
          const perluUpdate =
            existing.nama !== namaBersih ||
            existing.kelas !== namaKelas ||
            existing.status !== targetStatus;

          if (perluUpdate) {
            await connection.query(
              `UPDATE anggota 
               SET nama = ?, kelas = ?, status = ?, diperbarui_pada = NOW() 
               WHERE id = ?`,
              [namaBersih, namaKelas, targetStatus, existing.id]
            );

            totalDiperbarui++;
            if (existing.status === "aktif" && targetStatus === "nonaktif") {
              totalDinonaktifkan++;
            }
          }
        }
      }

      // Catat log audit sinkronisasi
      await connection.query(
        `INSERT INTO log_audit (waktu, aktor_id, ip_anonim, aksi, objek_tipe, objek_id, hasil, meta)
         VALUES (NOW(), ?, '127.0.0.1', 'ANGGOTA_SYNC_NETRI_SMS', 'anggota', 'netri_sms', 'sukses', ?)`,
        [
          auth.user.id,
          JSON.stringify({
            totalDitarik: studentsData.length,
            siswaBaru: totalBaru,
            siswaDiperbarui: totalDiperbarui,
            siswaNonaktif: totalDinonaktifkan,
          }),
        ]
      );

      await connection.commit();

      return responSukses(
        {
          totalDitarik: studentsData.length,
          baru: totalBaru,
          diperbarui: totalDiperbarui,
          dinonaktifkan: totalDinonaktifkan,
        },
        `Sinkronisasi Netri SMS berhasil! ${totalBaru} siswa baru ditambahkan, ${totalDiperbarui} data diperbarui.`
      );
    } catch (dbErr) {
      await connection.rollback();
      console.error("Gagal transaksi database sinkronisasi:", dbErr);
      throw dbErr;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error("Gagal sinkronisasi data dari Netri SMS:", error);
    return responGalat(
      error.message || "Terjadi kesalahan saat berkomunikasi dengan server Netri SMS",
      500
    );
  }
}
