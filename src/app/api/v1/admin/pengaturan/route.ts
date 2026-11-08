/**
 * Perpustakaan NETRI - API Pengaturan Sistem Perpustakaan
 * Mengambil dan memperbarui aturan operasional sirkulasi (lama pinjam, kuota buku, denda).
 */

import { NextRequest } from "next/server";
import { db, pool } from "@/db";
import { pengaturan } from "@/db/schema";
import { PengaturanUpdateSkema } from "@/contracts/skema";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";
import { tulisLogAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  try {
    const daftar = await db.select().from(pengaturan);
    return responSukses(daftar);
  } catch (error) {
    console.error("Gagal memuat pengaturan:", error);
    return responGalat("Gagal memuat pengaturan sistem", 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifikasiAkses(["admin"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(
      auth.pesan || "Hanya administrator yang dapat mengubah pengaturan sistem",
      auth.status || 403
    );
  }

  try {
    const body = await req.json();
    const parsed = PengaturanUpdateSkema.safeParse(body);

    if (!parsed.success) {
      return responGalat(
        parsed.error.errors[0]?.message || "Nilai pengaturan tidak valid",
        400
      );
    }

    const { lamaPinjamHari, maksBukuPerAnggota, dendaPerHariRp, namaPerpustakaan } =
      parsed.data;

    const entriUpdate: Array<{ kunci: string; nilai: string; keterangan: string }> = [
      {
        kunci: "lama_pinjam_hari",
        nilai: String(lamaPinjamHari),
        keterangan: "Durasi standar peminjaman buku dalam satuan hari kalender",
      },
      {
        kunci: "maks_buku_per_anggota",
        nilai: String(maksBukuPerAnggota),
        keterangan: "Batas maksimal eksemplar buku yang boleh dipinjam bersamaan per siswa",
      },
      {
        kunci: "denda_per_hari_rp",
        nilai: String(dendaPerHariRp),
        keterangan: "Nominal denda keterlambatan per hari per buku (Rupiah)",
      },
    ];

    if (namaPerpustakaan) {
      entriUpdate.push({
        kunci: "nama_perpustakaan",
        nilai: namaPerpustakaan.trim(),
        keterangan: "Nama resmi unit perpustakaan sekolah pada struk & kartu",
      });
    }

    for (const item of entriUpdate) {
      await pool.query(
        `INSERT INTO pengaturan (kunci, nilai, keterangan)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), keterangan = COALESCE(keterangan, VALUES(keterangan))`,
        [item.kunci, item.nilai, item.keterangan]
      );
    }

    await tulisLogAudit({
      aktorId: auth.user.id,
      aksi: "PENGATURAN_UPDATE",
      objekTipe: "pengaturan",
      objekId: "sistem",
      hasil: "sukses",
      meta: parsed.data,
    });

    const daftarTerbaru = await db.select().from(pengaturan);
    return responSukses(
      daftarTerbaru,
      "Pengaturan operasional perpustakaan berhasil disimpan."
    );
  } catch (error) {
    console.error("Gagal menyimpan pengaturan:", error);
    return responGalat("Terjadi kesalahan saat menyimpan pengaturan sistem", 500);
  }
}
