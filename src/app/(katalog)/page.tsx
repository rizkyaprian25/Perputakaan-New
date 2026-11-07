import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles, GraduationCap, Compass, Search, X, CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { buku, kategori, eksemplar } from "@/db/schema";
import { eq, sql, and, or } from "drizzle-orm";
import { BookCatalogGrid, ItemKatalogPublik } from "@/components/ui/BookCatalogGrid";

export const dynamic = "force-dynamic";

interface KatalogBerandaPageProps {
  searchParams?: Promise<{ q?: string; status?: string }>;
}

export default async function KatalogBerandaPage({ searchParams }: KatalogBerandaPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const queryPencarian = resolvedParams.q?.trim() || "";
  const filterHanyaTersedia = resolvedParams.status === "tersedia";

  let jumlahHiburan = 0;
  let jumlahPelajaran = 0;
  let daftarBuku: ItemKatalogPublik[] = [];

  try {
    const counts = await db
      .select({
        kelompok: kategori.kelompok,
        total: sql<number>`count(distinct ${buku.id})`,
      })
      .from(buku)
      .innerJoin(kategori, eq(buku.kategoriId, kategori.id))
      .where(sql`${buku.dihapusPada} IS NULL`)
      .groupBy(kategori.kelompok);

    counts.forEach((c) => {
      if (c.kelompok === "hiburan") jumlahHiburan = Number(c.total);
      if (c.kelompok === "pelajaran") jumlahPelajaran = Number(c.total);
    });

    const conditions = [sql`${buku.dihapusPada} IS NULL`];

    if (queryPencarian) {
      conditions.push(
        or(
          sql`${buku.judul} LIKE ${`%${queryPencarian}%`}`,
          sql`${buku.penulis} LIKE ${`%${queryPencarian}%`}`,
          sql`${buku.isbn} LIKE ${`%${queryPencarian}%`}`
        )!
      );
    }

    const rawBooks = await db
      .select({
        id: buku.id,
        judul: buku.judul,
        penulis: buku.penulis,
        penerbit: buku.penerbit,
        tahunTerbit: buku.tahunTerbit,
        jumlahHalaman: buku.jumlahHalaman,
        isbn: buku.isbn,
        sinopsis: buku.sinopsis,
        sampulBerkas: buku.sampulBerkas,
        lokasiRak: buku.lokasiRak,
        kelompok: kategori.kelompok,
        kategoriNama: kategori.nama,
        totalEksemplar: sql<number>`count(${eksemplar.id})`,
        tersediaEksemplar: sql<number>`sum(case when ${eksemplar.status} = 'tersedia' then 1 else 0 end)`,
      })
      .from(buku)
      .innerJoin(kategori, eq(buku.kategoriId, kategori.id))
      .leftJoin(eksemplar, eq(buku.id, eksemplar.bukuId))
      .where(and(...conditions))
      .groupBy(
        buku.id,
        buku.judul,
        buku.penulis,
        buku.penerbit,
        buku.tahunTerbit,
        buku.jumlahHalaman,
        buku.isbn,
        buku.sinopsis,
        buku.sampulBerkas,
        buku.lokasiRak,
        kategori.kelompok,
        kategori.nama
      )
      .limit(queryPencarian ? 60 : 12);

    let mappedBooks = rawBooks.map((b) => ({
      id: b.id,
      judul: b.judul,
      penulis: b.penulis,
      penerbit: b.penerbit,
      tahunTerbit: b.tahunTerbit,
      jumlahHalaman: b.jumlahHalaman,
      isbn: b.isbn,
      sinopsis: b.sinopsis,
      sampulUrl: b.sampulBerkas,
      lokasiRak: b.lokasiRak,
      kelompok: b.kelompok as "hiburan" | "pelajaran",
      kategoriNama: b.kategoriNama,
      totalEksemplar: Number(b.totalEksemplar || 0),
      tersediaEksemplar: Number(b.tersediaEksemplar || 0),
    }));

    if (filterHanyaTersedia) {
      mappedBooks = mappedBooks.filter((b) => b.tersediaEksemplar > 0);
    }

    daftarBuku = mappedBooks;
  } catch (error) {
    console.error("Gagal mengambil data katalog di beranda:", error);
  }

  return (
    <div className="space-y-12">
      {/* 1. Jika ada query pencarian, tampilkan Banner Hasil Pencarian */}
      {queryPencarian ? (
        <section className="bg-surface border border-line rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ink text-paper flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-ink-muted block">
                  Hasil Pencarian Global
                </span>
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink">
                  &ldquo;{queryPencarian}&rdquo;
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Ketersediaan */}
              <Link
                href={`/?q=${encodeURIComponent(queryPencarian)}${filterHanyaTersedia ? "" : "&status=tersedia"}`}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  filterHanyaTersedia
                    ? "bg-status-tersedia text-white border-status-tersedia"
                    : "border-line bg-paper-sunken/50 text-ink-muted hover:text-ink"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hanya yang Tersedia di Rak</span>
              </Link>

              {/* Tombol Hapus Pencarian */}
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg border border-line bg-paper-sunken/60 hover:bg-paper-sunken text-xs font-semibold text-ink inline-flex items-center gap-1.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Pencarian</span>
              </Link>
            </div>
          </div>

          <p className="text-xs font-mono text-ink-muted">
            Ditemukan <strong className="text-ink font-bold">{daftarBuku.length}</strong> judul buku dari semua kelompok koleksi.
          </p>
        </section>
      ) : (
        /* 2. Hero Desktop Widescreen: Dua Pintu Masuk Berdampingan */
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Panel Kiri: Hiburan (Warm Terracotta / Ember) */}
          <Link
            href="/katalog/hiburan"
            className="group relative bg-gradient-to-br from-group-hiburan via-[#ba3c08] to-[#8f2703] text-on-group rounded-2xl p-10 flex flex-col justify-between min-h-[310px] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden border border-white/15"
          >
            <div className="space-y-3 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-mono backdrop-blur-sm border border-white/25">
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span className="font-semibold tracking-wide">Kelompok Koleksi 1</span>
              </div>
              <h2 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
                Bacaan Hiburan
              </h2>
              <p className="text-white/90 text-sm sm:text-base max-w-md leading-relaxed pt-2">
                Koleksi novel sastra, kumpulan cerpen, komik grafis, biografi tokoh, dan ensiklopedia sains populer.
              </p>
            </div>

            <div className="flex items-center justify-between pt-8 border-t border-white/20 z-10">
              <span className="font-mono text-xs sm:text-sm tracking-wider uppercase text-white/90 font-medium tabular-nums">
                <strong className="text-white font-bold">{jumlahHiburan}</strong> Judul Buku Tersedia
              </span>
              <span className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold group-hover:translate-x-2 transition-transform bg-white/15 px-4 py-2 rounded-xl backdrop-blur-xs">
                Buka Katalog <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
            </div>

            {/* Aksen visual halus */}
            <div
              className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"
              aria-hidden="true"
            />
          </Link>

          {/* Panel Kanan: Pelajaran (Royal Blue / Oxford Sapphire) */}
          <Link
            href="/katalog/pelajaran"
            className="group relative bg-gradient-to-br from-group-pelajaran via-[#1b43be] to-[#122e83] text-on-group rounded-2xl p-10 flex flex-col justify-between min-h-[310px] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden border border-white/15"
          >
            <div className="space-y-3 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-mono backdrop-blur-sm border border-white/25">
                <GraduationCap className="w-3.5 h-3.5 text-blue-200" />
                <span className="font-semibold tracking-wide">Kelompok Koleksi 2</span>
              </div>
              <h2 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-white leading-none">
                Buku Pelajaran
              </h2>
              <p className="text-white/90 text-sm sm:text-base max-w-md leading-relaxed pt-2">
                Buku teks kurikulum merdeka, modul pelajaran, dan materi persiapan ujian per tingkat kelas.
              </p>
            </div>

            <div className="flex items-center justify-between pt-8 border-t border-white/20 z-10">
              <span className="font-mono text-xs sm:text-sm tracking-wider uppercase text-white/90 font-medium tabular-nums">
                <strong className="text-white font-bold">{jumlahPelajaran}</strong> Judul Buku Tersedia
              </span>
              <span className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold group-hover:translate-x-2 transition-transform bg-white/15 px-4 py-2 rounded-xl backdrop-blur-xs">
                Buka Katalog <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
            </div>

            {/* Aksen visual halus */}
            <div
              className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"
              aria-hidden="true"
            />
          </Link>
        </section>
      )}

      {/* 3. Bagian Koleksi Buku */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-ink-muted mb-1">
              <Compass className="w-4 h-4 text-ink-muted" />
              <span>{queryPencarian ? "Koleksi yang Cocok" : "Rak Buku Perpustakaan"}</span>
            </div>
            <h3 className="font-serif text-3xl font-semibold text-ink">
              {queryPencarian ? "Hasil Pencarian Buku" : "Koleksi Terpopuler"}
            </h3>
          </div>
          <p className="text-sm text-ink-muted">
            Klik pada kartu buku untuk melihat sinopsis, nomor ISBN, dan lokasi rak fisik.
          </p>
        </div>

        {daftarBuku.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-16 text-center shadow-sm">
            <BookOpen className="w-12 h-12 text-ink-muted mx-auto mb-3" />
            <h4 className="font-serif text-xl font-semibold text-ink mb-1">
              {queryPencarian ? "Tidak Ada Buku yang Cocok" : "Katalog Perpustakaan Belum Terisi"}
            </h4>
            <p className="text-ink-muted text-sm max-w-md mx-auto mb-4">
              {queryPencarian
                ? `Tidak ditemukan buku dengan kata kunci "${queryPencarian}". Coba periksa ejaan judul, nama penulis, atau nomor ISBN.`
                : "Petugas perpustakaan belum memasukkan data buku. Buka Portal Admin untuk menambah buku baru."}
            </p>
            {queryPencarian && (
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Tampilkan Semua Koleksi</span>
              </Link>
            )}
          </div>
        ) : (
          <BookCatalogGrid items={daftarBuku} />
        )}
      </section>
    </div>
  );
}
