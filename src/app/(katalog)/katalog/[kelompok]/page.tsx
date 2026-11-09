import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { buku, kategori, eksemplar } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { ItemKatalogPublik } from "@/components/ui/BookCatalogGrid";
import { BookshelfCatalog } from "@/components/ui/BookshelfCatalog";
import { ArrowLeft, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

interface KatalogKelompokPageProps {
  params: Promise<{ kelompok: string }>;
  searchParams: Promise<{ kategori?: string; q?: string }>;
}

export default async function KatalogKelompokPage({
  params,
  searchParams,
}: KatalogKelompokPageProps) {
  const { kelompok } = await params;
  const { kategori: kategoriSlug, q: searchQuery } = await searchParams;

  if (kelompok !== "hiburan" && kelompok !== "pelajaran") {
    notFound();
  }

  const isPelajaran = kelompok === "pelajaran";
  const namaKelompok = isPelajaran ? "Buku Pelajaran" : "Bacaan Hiburan";
  const deskripsiKelompok = isPelajaran
    ? "Buku teks wajib, modul ajar, dan referensi pelajaran kurikulum sekolah."
    : "Koleksi novel fiksi, cerita bergambar, puisi, dan wawasan sains umum.";

  // Ambil daftar kategori di dalam kelompok ini
  const daftarKategori = await db
    .select({
      id: kategori.id,
      nama: kategori.nama,
      slug: kategori.slug,
      jumlah: sql<number>`count(${buku.id})`,
    })
    .from(kategori)
    .leftJoin(buku, and(eq(buku.kategoriId, kategori.id), sql`${buku.dihapusPada} IS NULL`))
    .where(eq(kategori.kelompok, kelompok))
    .groupBy(kategori.id, kategori.nama, kategori.slug);

  // Ambil buku sesuai filter
  const conditions = [
    eq(kategori.kelompok, kelompok),
    sql`${buku.dihapusPada} IS NULL`,
  ];

  if (kategoriSlug) {
    conditions.push(eq(kategori.slug, kategoriSlug));
  }

  if (searchQuery) {
    conditions.push(
      sql`(${buku.judul} LIKE ${`%${searchQuery}%`} OR ${buku.penulis} LIKE ${`%${searchQuery}%`})`
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
      kategori.nama
    );

  const daftarBuku: ItemKatalogPublik[] = rawBooks.map((b) => ({
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
    kelompok: kelompok as "hiburan" | "pelajaran",
    kategoriNama: b.kategoriNama,
    totalEksemplar: Number(b.totalEksemplar || 0),
    tersediaEksemplar: Number(b.tersediaEksemplar || 0),
  }));

  return (
    <div className="space-y-8 font-sans">
      {/* Header Halaman Kelompok */}
      <div className="border-b border-line pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink mb-3 font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Beranda</span>
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span
              className={`inline-block font-mono text-xs uppercase px-2.5 py-0.5 rounded-full text-white font-semibold mb-2 shadow-xs ${
                isPelajaran ? "bg-group-pelajaran" : "bg-group-hiburan"
              }`}
            >
              Kelompok {kelompok}
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-ink tracking-tight">
              {namaKelompok}
            </h1>
            <p className="text-ink-muted text-sm mt-1 max-w-xl leading-relaxed">{deskripsiKelompok}</p>
          </div>

          <div className="font-mono text-xs text-ink-muted tabular-nums">
            Menampilkan <strong className="text-ink font-semibold">{daftarBuku.length}</strong> judul buku
          </div>
        </div>
      </div>

      {/* Filter Tabs Kategori Horizontal */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Link
          href={`/katalog/${kelompok}`}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors shadow-xs ${
            !kategoriSlug
              ? "bg-ink text-paper"
              : "bg-surface border border-line text-ink-muted hover:text-ink hover:bg-paper-sunken/60"
          }`}
        >
          Semua Kategori
        </Link>
        {daftarKategori.map((kat) => (
          <Link
            key={kat.id}
            href={`/katalog/${kelompok}?kategori=${kat.slug}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors shadow-xs ${
              kategoriSlug === kat.slug
                ? isPelajaran
                  ? "bg-group-pelajaran text-white"
                  : "bg-group-hiburan text-white"
                : "bg-surface border border-line text-ink-muted hover:text-ink hover:bg-paper-sunken/60"
            }`}
          >
            {kat.nama} <span className="opacity-75 tabular-nums">({Number(kat.jumlah || 0)})</span>
          </Link>
        ))}
      </div>

      {/* Grid Koleksi Buku */}
      {daftarBuku.length === 0 ? (
        <div className="bg-surface border border-line rounded-lg p-12 text-center">
          <BookOpen className="w-10 h-10 text-ink-muted mx-auto mb-3" />
          <h3 className="font-serif text-xl font-semibold text-ink mb-1">
            Belum Ada Buku di Kategori Ini
          </h3>
          <p className="text-ink-muted text-sm max-w-md mx-auto mb-4">
            Belum ada eksemplar yang didaftarkan pada kategori ini, atau kata kunci pencarian Anda
            tidak cocok.
          </p>
          <Link
            href={`/katalog/${kelompok}`}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-ink text-paper text-xs font-medium min-h-[44px]"
          >
            Tampilkan Semua {namaKelompok}
          </Link>
        </div>
      ) : (
        <BookshelfCatalog
          items={daftarBuku}
          defaultViewMode="spines"
          showGroupFilter={false}
          judulLemari={`Lemari ${namaKelompok}`}
        />
      )}
    </div>
  );
}
