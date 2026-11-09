/**
 * Perpustakaan NETRI - API Rincian Buku, Edit, Hapus (Soft-Delete), dan Manajemen Eksemplar Fisik
 */

import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { pool } from "@/db";
import {
  BukuUpdateSkema,
  EksemplarTambahSkema,
  EksemplarUbahStatusSkema,
} from "@/contracts/skema";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";
import { ulid } from "ulid";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Helper pembersih berkas sampul .webp lama di penyimpanan lokal jika sudah tidak terpakai
async function hapusBerkasSampulLokalJikaTidakTerpakai(sampulLama: string | null | undefined, kecualiBukuId: string) {
  if (!sampulLama || !sampulLama.startsWith("/uploads/sampul/") || !sampulLama.endsWith(".webp")) {
    return;
  }

  try {
    // Pastikan tidak ada buku lain yang menggunakan berkas sampul yang sama
    const [rows]: any = await pool.query(
      "SELECT COUNT(*) as total FROM buku WHERE sampul_berkas = ? AND id != ? AND dihapus_pada IS NULL",
      [sampulLama, kecualiBukuId]
    );
    if (Number(rows?.[0]?.total || 0) > 0) return;

    const namaBerkas = path.basename(sampulLama);
    if (!namaBerkas.startsWith("sampul-") || !namaBerkas.endsWith(".webp")) return;

    const filePath = path.join(process.cwd(), "public", "uploads", "sampul", namaBerkas);
    await fs.unlink(filePath).catch(() => {});
  } catch {
    // Abaikan jika berkas memang sudah tidak ada di disk
  }
}

// 1. Ambil Rincian Buku beserta Seluruh Daftar Eksemplar Fisiknya
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { id } = await context.params;
  const connection = await pool.getConnection();

  try {
    const [bukuRows]: any = await connection.query(
      `SELECT b.id, b.isbn, b.judul, b.penulis, b.penerbit, b.tahun_terbit as tahunTerbit,
              b.jumlah_halaman as jumlahHalaman, b.sinopsis, b.sampul_berkas as sampulUrl,
              b.kategori_id as kategoriId, k.nama as kategoriNama, k.kelompok,
              b.lokasi_rak as lokasiRak, b.sumber
       FROM buku b
       JOIN kategori k ON b.kategori_id = k.id
       WHERE b.id = ? AND b.dihapus_pada IS NULL`,
      [id]
    );

    if (!bukuRows || bukuRows.length === 0) {
      return responGalat("Data buku tidak ditemukan", 404);
    }

    const [eksemplarRows]: any = await connection.query(
      `SELECT e.id, e.kode, e.status, e.dibuat_pada as dibuatPada,
              p.id as peminjamanId, p.jatuh_tempo as jatuhTempo,
              a.nama as peminjamNama, a.nomor_induk as peminjamNis, a.kelas as peminjamKelas
       FROM eksemplar e
       LEFT JOIN peminjaman p ON e.id = p.eksemplar_id AND p.dikembalikan_pada IS NULL
       LEFT JOIN anggota a ON p.anggota_id = a.id
       WHERE e.buku_id = ?
       ORDER BY e.kode ASC`,
      [id]
    );

    return responSukses(
      {
        buku: bukuRows[0],
        eksemplar: eksemplarRows,
      },
      "Rincian buku dan eksemplar berhasil dimuat"
    );
  } catch (error) {
    console.error("Gagal memuat rincian buku:", error);
    return responGalat("Terjadi kesalahan saat memuat rincian buku", 500);
  } finally {
    connection.release();
  }
}

// 2. Edit / Perbarui Metadata Buku
export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { id } = await context.params;
  const json = await req.json();
  const parse = BukuUpdateSkema.safeParse(json);

  if (!parse.success) {
    return responGalat(parse.error.errors[0]?.message || "Data buku tidak valid", 400);
  }

  const data = parse.data;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [cekRows]: any = await connection.query(
      "SELECT id, judul, sampul_berkas as sampulLama FROM buku WHERE id = ? AND dihapus_pada IS NULL FOR UPDATE",
      [id]
    );

    if (!cekRows || cekRows.length === 0) {
      await connection.rollback();
      return responGalat("Buku tidak ditemukan", 404);
    }

    const sampulLama: string | null = cekRows[0].sampulLama || null;
    const sampulBaru: string | null = data.sampulUrl || null;

    await connection.query(
      `UPDATE buku
       SET isbn = ?, judul = ?, penulis = ?, penerbit = ?, tahun_terbit = ?,
           jumlah_halaman = ?, kategori_id = ?, sinopsis = ?, sampul_berkas = ?,
           lokasi_rak = ?, diperbarui_pada = NOW()
       WHERE id = ?`,
      [
        data.isbn || null,
        data.judul,
        data.penulis,
        data.penerbit || null,
        data.tahunTerbit || null,
        data.jumlahHalaman || null,
        data.kategoriId,
        data.sinopsis || null,
        sampulBaru,
        data.lokasiRak || null,
        id,
      ]
    );

    await connection.query(
      `INSERT INTO log_audit (waktu, aktor_id, ip_anonim, aksi, objek_tipe, objek_id, hasil, meta)
       VALUES (NOW(), ?, '127.0.0.1', 'BUKU_EDIT', 'buku', ?, 'sukses', ?)`,
      [auth.user.id, id, JSON.stringify({ judul: data.judul, penulis: data.penulis })]
    );

    await connection.commit();

    // Bersihkan berkas sampul .webp lama jika sampul diganti atau dihapus
    if (sampulLama && sampulLama !== sampulBaru) {
      await hapusBerkasSampulLokalJikaTidakTerpakai(sampulLama, id);
    }

    return responSukses({ id, judul: data.judul }, `Data buku '${data.judul}' berhasil diperbarui.`);
  } catch (error) {
    await connection.rollback();
    console.error("Gagal memperbarui buku:", error);
    return responGalat("Terjadi kesalahan saat menyimpan perubahan buku", 500);
  } finally {
    connection.release();
  }
}

// 3. Tambah Eksemplar Baru atau Ubah Status Eksemplar
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { id } = await context.params;
  const json = await req.json();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Cabang A: Tambah N Eksemplar Baru untuk Buku Ini
    if (json.aksi === "tambah_eksemplar") {
      const parse = EksemplarTambahSkema.safeParse(json);
      if (!parse.success) {
        await connection.rollback();
        return responGalat(parse.error.errors[0]?.message || "Jumlah eksemplar tidak valid", 400);
      }

      const [bukuRows]: any = await connection.query(
        "SELECT id, judul FROM buku WHERE id = ? AND dihapus_pada IS NULL FOR UPDATE",
        [id]
      );
      if (!bukuRows || bukuRows.length === 0) {
        await connection.rollback();
        return responGalat("Buku tidak ditemukan", 404);
      }

      const [maxRows]: any = await connection.query(
        "SELECT COALESCE(MAX(CAST(SUBSTRING(kode, 4) AS UNSIGNED)), 0) as max_num FROM eksemplar WHERE kode REGEXP '^BB-[0-9]+$' FOR UPDATE"
      );
      let counter = Number(maxRows[0]?.max_num || 0) + 1;
      const kodeBaru: string[] = [];

      for (let i = 0; i < parse.data.jumlah; i++) {
        const eksId = ulid();
        const kode = `BB-${String(counter).padStart(6, "0")}`;
        counter++;
        await connection.query(
          "INSERT INTO eksemplar (id, buku_id, kode, status) VALUES (?, ?, ?, 'tersedia')",
          [eksId, id, kode]
        );
        kodeBaru.push(kode);
      }

      await connection.query(
        `INSERT INTO log_audit (waktu, aktor_id, ip_anonim, aksi, objek_tipe, objek_id, hasil, meta)
         VALUES (NOW(), ?, '127.0.0.1', 'EKSEMPLAR_TAMBAH', 'buku', ?, 'sukses', ?)`,
        [auth.user.id, id, JSON.stringify({ jumlah: parse.data.jumlah, kodeBaru })]
      );

      await connection.commit();
      return responSukses(
        { kodeBaru },
        `${parse.data.jumlah} eksemplar baru (${kodeBaru.join(", ")}) berhasil ditambahkan.`
      );
    }

    // Cabang B: Ubah Status Kondisi Fisik Eksemplar
    if (json.aksi === "ubah_status") {
      const parse = EksemplarUbahStatusSkema.safeParse(json);
      if (!parse.success) {
        await connection.rollback();
        return responGalat(parse.error.errors[0]?.message || "Parameter status tidak valid", 400);
      }

      const [eksRows]: any = await connection.query(
        "SELECT id, kode, status FROM eksemplar WHERE id = ? AND buku_id = ? FOR UPDATE",
        [parse.data.eksemplarId, id]
      );

      if (!eksRows || eksRows.length === 0) {
        await connection.rollback();
        return responGalat("Eksemplar tidak ditemukan", 404);
      }

      if (eksRows[0].status === "dipinjam") {
        await connection.rollback();
        return responGalat(
          `Eksemplar ${eksRows[0].kode} sedang dipinjam siswa. Kembalikan terlebih dahulu di Meja Sirkulasi.`,
          422
        );
      }

      await connection.query(
        "UPDATE eksemplar SET status = ?, diperbarui_pada = NOW() WHERE id = ?",
        [parse.data.status, parse.data.eksemplarId]
      );

      await connection.query(
        `INSERT INTO log_audit (waktu, aktor_id, ip_anonim, aksi, objek_tipe, objek_id, hasil, meta)
         VALUES (NOW(), ?, '127.0.0.1', 'EKSEMPLAR_UBAH_STATUS', 'eksemplar', ?, 'sukses', ?)`,
        [
          auth.user.id,
          parse.data.eksemplarId,
          JSON.stringify({ kode: eksRows[0].kode, statusBaru: parse.data.status }),
        ]
      );

      await connection.commit();
      return responSukses(
        { kode: eksRows[0].kode, status: parse.data.status },
        `Status eksemplar ${eksRows[0].kode} berhasil diubah menjadi '${parse.data.status}'.`
      );
    }

    await connection.rollback();
    return responGalat("Aksi tidak dikenali", 400);
  } catch (error) {
    await connection.rollback();
    console.error("Gagal memproses aksi eksemplar:", error);
    return responGalat("Terjadi kesalahan saat memproses eksemplar", 500);
  } finally {
    connection.release();
  }
}

// 4. Hapus Buku (Soft-Delete dengan proteksi pinjaman aktif)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { id } = await context.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [bukuRows]: any = await connection.query(
      "SELECT id, judul, sampul_berkas as sampulLama FROM buku WHERE id = ? AND dihapus_pada IS NULL FOR UPDATE",
      [id]
    );

    if (!bukuRows || bukuRows.length === 0) {
      await connection.rollback();
      return responGalat("Buku tidak ditemukan", 404);
    }

    // Pastikan tidak ada eksemplar buku ini yang sedang dipinjam
    const [pinjamAktif]: any = await connection.query(
      "SELECT COUNT(*) as sedangDipinjam FROM eksemplar WHERE buku_id = ? AND status = 'dipinjam'",
      [id]
    );

    if (Number(pinjamAktif[0]?.sedangDipinjam || 0) > 0) {
      await connection.rollback();
      return responGalat(
        "Buku tidak dapat dihapus karena masih ada eksemplar yang sedang dipinjam oleh siswa.",
        422
      );
    }

    await connection.query(
      "UPDATE buku SET dihapus_pada = NOW(), diperbarui_pada = NOW() WHERE id = ?",
      [id]
    );

    await connection.query(
      `INSERT INTO log_audit (waktu, aktor_id, ip_anonim, aksi, objek_tipe, objek_id, hasil, meta)
       VALUES (NOW(), ?, '127.0.0.1', 'BUKU_HAPUS', 'buku', ?, 'sukses', ?)`,
      [auth.user.id, id, JSON.stringify({ judul: bukuRows[0].judul })]
    );

    await connection.commit();
    return responSukses({ id }, `Buku '${bukuRows[0].judul}' telah dihapus dari katalog aktif.`);
  } catch (error) {
    await connection.rollback();
    console.error("Gagal menghapus buku:", error);
    return responGalat("Terjadi kesalahan saat menghapus buku", 500);
  } finally {
    connection.release();
  }
}
