import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles, GraduationCap } from "lucide-react";
import { db } from "@/db";
import { buku, kategori, eksemplar } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { BookCover } from "@/components/ui/BookCover";
import { BookSpineTick } from "@/components/ui/BookSpineTick";

export const dynamic = "force-dynamic";

export default async function KatalogBerandaPage() {
  // Ambil ringkasan jumlah buku per kelompok
  let jumlahHiburan = 0;
  let jumlahPelajaran = 0;
  let daftarBuku: Array<{
    id: string;
    judul: string;
    penulis: string;
    kelompok: "hiburan" | "pelajaran";
    kategoriNama: string;
    totalEksemplar: number;
    tersediaEksemplar: number;
  }> = [];

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

    // Ambil sampel buku untuk ditampilkan di beranda
    const rawBooks = await db
      .select({
        id: buku.id,
        judul: buku.judul,
        penulis: buku.penulis,
        kelompok: kategori.kelompok,
        kategoriNama: kategori.nama,
        totalEksemplar: sql<number>`count(${eksemplar.id})`,
        tersediaEksemplar: sql<number>`sum(case when ${eksemplar.status} = 'tersedia' then 1 else 0 end)`,
      })
      .from(buku)
      .innerJoin(kategori, eq(buku.kategoriId, kategori.id))
      .leftJoin(eksemplar, eq(buku.id, eksemplar.bukuId))
      .where(sql`${buku.dihapusPada} IS NULL`)
      .groupBy(buku.id, kategori.kelompok, kategori.nama)
      .limit(6);

    daftarBuku = rawBooks.map((b) => ({
      id: b.id,
      judul: b.judul,
      penulis: b.penulis,
      kelompok: b.kelompok as "hiburan" | "pelajaran",
      kategoriNama: b.kategoriNama,
      totalEksemplar: Number(b.totalEksemplar || 0),
      tersediaEksemplar: Number(b.tersediaEksemplar || 0),
    }));
  } catch (error) {
    console.error("Gagal mengambil data katalog di beranda:", error);
  }

  return (
    <div className="space-y-12">
      {/* 1. Hero: Dua Pintu Masuk Besar (Hiburan vs Pelajaran) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blok Hiburan */}
        <Link
          href="/katalog/hiburan"
          className="group relative bg-group-hiburan text-on-group rounded-lg p-6 md:p-8 flex flex-col justify-between min-h-[220px] md:min-h-[260px] shadow-sm hover:brightness-105 transition-all overflow-hidden"
        >
          <div className="space-y-2 z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kelompok Bacaan</span>
            </div>
            <h2 className="font-serif text-3xl md:text-5xl font-semibold tracking-tight">
              Hiburan
            </h2>
            <p className="text-white/80 text-sm max-w-sm">
              Novel sastra, cerita pendek, komik, biografi inspiratif, dan sains populer.
            </p>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-white/20 z-10">
            <span className="font-mono text-xs tracking-wider uppercase">
              {jumlahHiburan} Judul Koleksi
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium group-hover:translate-x-1 transition-transform">
              Jelajahi <ArrowRight className="w-4 h-4" />
            </span>
          </div>

          {/* Hiasan Punggung Buku Halus di Belakang */}
          <div
            className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/5 pointer-events-none"
            aria-hidden="true"
          />
        </Link>

        {/* Blok Pelajaran */}
        <Link
          href="/katalog/pelajaran"
          className="group relative bg-group-pelajaran text-on-group rounded-lg p-6 md:p-8 flex flex-col justify-between min-h-[220px] md:min-h-[260px] shadow-sm hover:brightness-105 transition-all overflow-hidden"
        >
          <div className="space-y-2 z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-mono">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Kelompok Belajar</span>
            </div>
            <h2 className="font-serif text-3xl md:text-5xl font-semibold tracking-tight">
              Pelajaran
            </h2>
            <p className="text-white/80 text-sm max-w-sm">
              Buku teks kurikulum merdeka, referensi mata pelajaran, dan pegangan materi kelas.
            </p>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-white/20 z-10">
            <span className="font-mono text-xs tracking-wider uppercase">
              {jumlahPelajaran} Judul Koleksi
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium group-hover:translate-x-1 transition-transform">
              Jelajahi <ArrowRight className="w-4 h-4" />
            </span>
          </div>

          <div
            className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/5 pointer-events-none"
            aria-hidden="true"
          />
        </Link>
      </section>

      {/* 2. Daftar Koleksi Terbaru & Ketersediaan */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-line pb-4">
          <div>
            <h3 className="font-serif text-2xl font-semibold text-ink">Koleksi Pilihan di Rak</h3>
            <p className="text-ink-muted text-sm mt-0.5">
              Lihat status ketersediaan buku secara langsung sebelum datang ke meja sirkulasi.
            </p>
          </div>
        </div>

        {daftarBuku.length === 0 ? (
          /* Empty State */
          <div className="bg-surface border border-line rounded-lg p-10 text-center">
            <BookOpen className="w-8 h-8 text-ink-muted mx-auto mb-2" />
            <h4 className="font-serif text-lg font-semibold text-ink mb-1">
              Katalog Belum Memiliki Buku
            </h4>
            <p className="text-ink-muted text-sm max-w-sm mx-auto">
              Petugas belum memasukkan data buku ke dalam sistem. Silakan cek kembali nanti.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {daftarBuku.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 group">
                <BookCover
                  judul={item.judul}
                  penulis={item.penulis}
                  kelompok={item.kelompok}
                  className="group-hover:shadow-md transition-shadow"
                />
                <div className="flex flex-col gap-1 mt-1">
                  <span className="font-mono text-[10px] text-ink-muted uppercase">
                    {item.kategoriNama}
                  </span>
                  <h4 className="font-serif font-semibold text-sm leading-tight text-ink line-clamp-2">
                    {item.judul}
                  </h4>
                  <p className="text-xs text-ink-muted line-clamp-1">{item.penulis}</p>

                  {/* Penanda Balok Punggung Buku */}
                  <BookSpineTick
                    total={item.totalEksemplar}
                    tersedia={item.tersediaEksemplar}
                    className="mt-1"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
