/**
 * Bilik Baca - API Manajemen Koleksi Buku (Admin & Petugas)
 * Mendukung penambahan judul baru dan pembuatan N eksemplar fisik otomatis.
 */

import { NextRequest } from "next/server";
import { db, pool } from "@/db";
import { buku, eksemplar, kategori } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { BukuBaruSkema } from "@/contracts/skema";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";
import { ulid } from "ulid";
import { tulisLogAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const dataBuku = await db
    .select({
      id: buku.id,
      isbn: buku.isbn,
      judul: buku.judul,
      penulis: buku.penulis,
      penerbit: buku.penerbit,
      tahunTerbit: buku.tahunTerbit,
      sinopsis: buku.sinopsis,
      kategoriId: buku.kategoriId,
      kategoriNama: kategori.nama,
      kelompok: kategori.kelompok,
      lokasiRak: buku.lokasiRak,
      sumber: buku.sumber,
      totalEksemplar: sql<number>`count(${eksemplar.id})`,
      tersediaEksemplar: sql<number>`sum(case when ${eksemplar.status} = 'tersedia' then 1 else 0 end)`,
    })
    .from(buku)
    .innerJoin(kategori, eq(buku.kategoriId, kategori.id))
    .leftJoin(eksemplar, eq(buku.id, eksemplar.bukuId))
    .where(
      q
        ? sql`${buku.dihapusPada} IS NULL AND (${buku.judul} LIKE ${`%${q}%`} OR ${buku.penulis} LIKE ${`%${q}%`})`
        : sql`${buku.dihapusPada} IS NULL`
    )
    .groupBy(buku.id, kategori.nama, kategori.kelompok)
    .orderBy(desc(buku.dibuatPada));

  return responSukses(dataBuku, "Daftar buku berhasil diambil");
}

export async function POST(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const json = await req.json();
  const parse = BukuBaruSkema.safeParse(json);

  if (!parse.success) {
    return responGalat(parse.error.errors[0]?.message || "Data buku tidak valid", 400);
  }

  const data = parse.data;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const bukuId = ulid();

    // 1. Simpan Judul Buku
    await connection.query(
      `INSERT INTO buku 
       (id, isbn, judul, penulis, penerbit, tahun_terbit, jumlah_halaman, sinopsis, kategori_id, lokasi_rak, sumber, id_sumber) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bukuId,
        data.isbn || null,
        data.judul,
        data.penulis,
        data.penerbit || null,
        data.tahunTerbit || null,
        data.jumlahHalaman || null,
        data.sinopsis || null,
        data.kategoriId,
        data.lokasiRak || null,
        data.sumber,
        data.idSumberEksternal || null,
      ]
    );

    // 2. Bangkitkan N Eksemplar Fisik Berurutan
    // Format kode: BB-XXXXXX (ambil counter dari database)
    const [countRows]: any = await connection.query("SELECT COUNT(*) as total FROM eksemplar");
    let counter = Number(countRows[0]?.total || 0) + 1;

    const daftarKodeEksemplar: string[] = [];

    for (let i = 0; i < data.jumlahEksemplar; i++) {
      const eksemplarId = ulid();
      const kodeStr = String(counter).padStart(6, "0");
      const kode = `BB-${kodeStr}`;
      counter++;

      await connection.query(
        "INSERT INTO eksemplar (id, buku_id, kode, status) VALUES (?, ?, ?, 'tersedia')",
        [eksemplarId, bukuId, kode]
      );
      daftarKodeEksemplar.push(kode);
    }

    // 3. Catat log audit
    await connection.query(
      `INSERT INTO log_audit (waktu, aktor_id, ip_anonim, aksi, objek_tipe, objek_id, hasil, meta)
       VALUES (NOW(), ?, '127.0.0.1', 'BUKU_TAMBAH_BARU', 'buku', ?, 'sukses', ?)`,
      [
        auth.user.id,
        bukuId,
        JSON.stringify({
          judul: data.judul,
          penulis: data.penulis,
          jumlahEksemplar: data.jumlahEksemplar,
          daftarKodeEksemplar,
        }),
      ]
    );

    await connection.commit();

    return responSukses(
      {
        bukuId,
        judul: data.judul,
        jumlahEksemplar: data.jumlahEksemplar,
        daftarKodeEksemplar,
      },
      `Buku '${data.judul}' dan ${data.jumlahEksemplar} eksemplar fisik berhasil didaftarkan.`
    );
  } catch (error) {
    await connection.rollback();
    console.error("Gagal menyimpan buku baru:", error);
    return responGalat("Terjadi kendala saat menyimpan buku ke database", 500);
  } finally {
    connection.release();
  }
}
