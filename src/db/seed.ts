/**
 * Perpustakaan NETRI - Skrip Seed Basis Data Awal (Fase 1 Foundation)
 * Menyiapkan kategori baku, pengaturan dasar, akun admin pertama, dan data contoh realistis.
 */

import { db, pool } from "./index";
import { kategori, pengaturan, pengguna, buku, eksemplar, anggota } from "./schema";
import { ulid } from "ulid";
import * as argon2 from "@node-rs/argon2";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Memulai seeding basis data Perpustakaan NETRI...");

  // 1. Kategori Baku (Hiburan vs Pelajaran)
  console.log("-> Seeding kategori buku...");
  const kategoriData = [
    // Kelompok Hiburan & Wawasan Umum
    { id: ulid(), kelompok: "hiburan" as const, nama: "Novel", slug: "novel" },
    { id: ulid(), kelompok: "hiburan" as const, nama: "Komik", slug: "komik" },
    { id: ulid(), kelompok: "hiburan" as const, nama: "Cerpen & Puisi", slug: "cerpen-puisi" },
    { id: ulid(), kelompok: "hiburan" as const, nama: "Biografi", slug: "biografi" },
    { id: ulid(), kelompok: "hiburan" as const, nama: "Sains Populer", slug: "sains-populer" },
    { id: ulid(), kelompok: "hiburan" as const, nama: "Pengembangan Diri", slug: "pengembangan-diri" },
    { id: ulid(), kelompok: "hiburan" as const, nama: "Filsafat & Makna Hidup", slug: "filsafat-makna-hidup" },
    { id: ulid(), kelompok: "hiburan" as const, nama: "Psikologi", slug: "psikologi" },
    { id: ulid(), kelompok: "hiburan" as const, nama: "Nonfiksi Umum", slug: "nonfiksi-umum" },
    { id: ulid(), kelompok: "hiburan" as const, nama: "Bisnis & Finansial", slug: "bisnis-finansial" },
    { id: ulid(), kelompok: "hiburan" as const, nama: "Sejarah & Budaya", slug: "sejarah-budaya" },
    { id: ulid(), kelompok: "hiburan" as const, nama: "Teknologi & Digital", slug: "teknologi-digital" },
    { id: ulid(), kelompok: "hiburan" as const, nama: "Religi & Spiritualitas", slug: "religi-spiritualitas" },

    // Kelompok Pelajaran
    { id: ulid(), kelompok: "pelajaran" as const, nama: "Matematika", slug: "matematika" },
    { id: ulid(), kelompok: "pelajaran" as const, nama: "Ilmu Pengetahuan Alam (IPA)", slug: "ipa" },
    { id: ulid(), kelompok: "pelajaran" as const, nama: "Ilmu Pengetahuan Sosial (IPS)", slug: "ips" },
    { id: ulid(), kelompok: "pelajaran" as const, nama: "Bahasa Indonesia", slug: "bahasa-indonesia" },
    { id: ulid(), kelompok: "pelajaran" as const, nama: "Bahasa Inggris", slug: "bahasa-inggris" },
    { id: ulid(), kelompok: "pelajaran" as const, nama: "Pendidikan Agama & Budi Pekerti", slug: "pai" },
    { id: ulid(), kelompok: "pelajaran" as const, nama: "PPKn", slug: "ppkn" },
    { id: ulid(), kelompok: "pelajaran" as const, nama: "Lainnya", slug: "pelajaran-lainnya" },
  ];

  for (const kat of kategoriData) {
    await db
      .insert(kategori)
      .values(kat)
      .onDuplicateKeyUpdate({ set: { nama: kat.nama } });
  }

  // 2. Pengaturan Baku Sistem Perpustakaan
  console.log("-> Seeding pengaturan perpustakaan...");
  const pengaturanData = [
    { kunci: "lama_pinjam_hari", nilai: "7", keterangan: "Durasi peminjaman standar dalam satuan hari" },
    { kunci: "maks_buku_per_anggota", nilai: "3", keterangan: "Batas maksimal buku yang dapat dipinjam bersamaan" },
    { kunci: "maks_perpanjangan", nilai: "1", keterangan: "Batas maksimal perpanjangan masa pinjam" },
    { kunci: "denda_per_hari_rp", nilai: "0", keterangan: "Tarif denda per hari keterlambatan (0 = nonaktif)" },
  ];

  for (const set of pengaturanData) {
    await db
      .insert(pengaturan)
      .values(set)
      .onDuplicateKeyUpdate({ set: { nilai: set.nilai } });
  }

  // 3. Akun Admin Awal (Argon2id Hash)
  console.log("-> Seeding akun staf admin...");
  const passwordHash = await argon2.hash("AdminBilikBaca2026!", {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const existingAdmin = await db.query.pengguna.findFirst({
    where: eq(pengguna.username, "admin"),
  });

  let adminId = existingAdmin?.id;
  if (!existingAdmin) {
    adminId = ulid();
    await db.insert(pengguna).values({
      id: adminId,
      username: "admin",
      kataSandiHash: passwordHash,
      peran: "admin",
      aktif: true,
    });
    console.log("   Akun admin dibuat: username = 'admin', password = 'AdminBilikBaca2026!'");
  }

  // 4. Seeding Data Buku Contoh & Eksemplar
  console.log("-> Seeding buku dan eksemplar contoh...");
  const katNovel = await db.query.kategori.findFirst({ where: eq(kategori.slug, "novel") });
  const katMtk = await db.query.kategori.findFirst({ where: eq(kategori.slug, "matematika") });

  if (katNovel && katMtk) {
    // Buku 1: Novel Laskar Pelangi (Hiburan)
    const existingLaskar = await db.query.buku.findFirst({ where: eq(buku.isbn, "9789793062792") });
    if (!existingLaskar) {
      const bukuId1 = ulid();
      await db.insert(buku).values({
        id: bukuId1,
        isbn: "9789793062792",
        judul: "Laskar Pelangi",
        penulis: "Andrea Hirata",
        penerbit: "Bentang Pustaka",
        tahunTerbit: 2005,
        jumlahHalaman: 529,
        sinopsis:
          "Kisah perjuangan sepuluh anak di Belitung dalam menempuh pendidikan di sekolah sederhana dengan semangat pantang menyerah.",
        kategoriId: katNovel.id,
        lokasiRak: "R-01-A",
        sumber: "manual",
      });

      // Buat 4 Eksemplar untuk Laskar Pelangi
      for (let i = 1; i <= 4; i++) {
        await db.insert(eksemplar).values({
          id: ulid(),
          bukuId: bukuId1,
          kode: `BB-NVL-000${i}`,
          status: "tersedia",
        });
      }
    }

    // Buku 2: Matematika Kelas VII (Pelajaran)
    const existingMtk = await db.query.buku.findFirst({ where: eq(buku.isbn, "9786022443456") });
    if (!existingMtk) {
      const bukuId2 = ulid();
      await db.insert(buku).values({
        id: bukuId2,
        isbn: "9786022443456",
        judul: "Matematika SMP/MTs Kelas VII",
        penulis: "Tim Kemendikbudristek",
        penerbit: "Pusat Kurikulum dan Perbukuan",
        tahunTerbit: 2021,
        jumlahHalaman: 312,
        sinopsis: "Buku teks utama siswa mata pelajaran Matematika kurikulum merdeka kelas VII SMP/MTs.",
        kategoriId: katMtk.id,
        lokasiRak: "P-07-M",
        sumber: "manual",
      });

      // Buat 10 Eksemplar untuk Matematika
      for (let i = 1; i <= 10; i++) {
        const kodeStr = i < 10 ? `00${i}` : `0${i}`;
        await db.insert(eksemplar).values({
          id: ulid(),
          bukuId: bukuId2,
          kode: `BB-MTK-${kodeStr}`,
          status: "tersedia",
        });
      }
    }
  }

  // 5. Data anggota siswa asli disinkronkan langsung dari Netri SMS (tidak menyisipkan anggota dummy)
  console.log("✅ Seeding basis data Perpustakaan NETRI selesai dengan sempurna!");
}

main()
  .catch((err) => {
    console.error("❌ Terjadi kesalahan saat seeding:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
