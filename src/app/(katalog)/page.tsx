import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles, GraduationCap, Compass } from "lucide-react";
import { db } from "@/db";
import { buku, kategori, eksemplar } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { BookCover } from "@/components/ui/BookCover";
import { BookSpineTick } from "@/components/ui/BookSpineTick";

export const dynamic = "force-dynamic";

export default async function KatalogBerandaPage() {
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
      {/* 1. Hero Desktop Widescreen: Dua Pintu Masuk Berdampingan */}
      <section className="grid grid-cols-2 gap-8">
        {/* Panel Kiri: Hiburan (Jingga-Bata #B8381A) */}
        <Link
          href="/katalog/hiburan"
          className="group relative bg-group-hiburan text-on-group rounded-xl p-10 flex flex-col justify-between min-h-[300px] shadow-sm hover:shadow-md hover:brightness-105 transition-all overflow-hidden"
        >
          <div className="space-y-3 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-mono backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kelompok Koleksi 1</span>
            </div>
            <h2 className="font-serif text-5xl font-semibold tracking-tight text-white leading-none">
              Bacaan Hiburan
            </h2>
            <p className="text-white/85 text-base max-w-md leading-relaxed pt-2">
              Koleksi novel sastra, kumpulan cerpen, komik grafis, biografi tokoh, dan ensiklopedia sains populer.
            </p>
          </div>

          <div className="flex items-center justify-between pt-8 border-t border-white/25 z-10">
            <span className="font-mono text-sm tracking-widest uppercase text-white/90">
              {jumlahHiburan} Judul Buku Tersedia
            </span>
            <span className="inline-flex items-center gap-2 text-base font-semibold group-hover:translate-x-2 transition-transform">
              Buka Katalog <ArrowRight className="w-5 h-5" />
            </span>
          </div>

          {/* Hiasan Punggung Buku Tekstur Desktop */}
          <div
            className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none"
            aria-hidden="true"
          />
        </Link>

        {/* Panel Kanan: Pelajaran (Biru Tinta #1F3FA8) */}
        <Link
          href="/katalog/pelajaran"
          className="group relative bg-group-pelajaran text-on-group rounded-xl p-10 flex flex-col justify-between min-h-[300px] shadow-sm hover:shadow-md hover:brightness-105 transition-all overflow-hidden"
        >
          <div className="space-y-3 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-mono backdrop-blur-sm">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Kelompok Koleksi 2</span>
            </div>
            <h2 className="font-serif text-5xl font-semibold tracking-tight text-white leading-none">
              Buku Pelajaran
            </h2>
            <p className="text-white/85 text-base max-w-md leading-relaxed pt-2">
              Buku teks kurikulum merdeka, modul pelajaran, dan materi persiapan ujian per tingkat kelas.
            </p>
          </div>

          <div className="flex items-center justify-between pt-8 border-t border-white/25 z-10">
            <span className="font-mono text-sm tracking-widest uppercase text-white/90">
              {jumlahPelajaran} Judul Buku Tersedia
            </span>
            <span className="inline-flex items-center gap-2 text-base font-semibold group-hover:translate-x-2 transition-transform">
              Buka Katalog <ArrowRight className="w-5 h-5" />
            </span>
          </div>

          <div
            className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none"
            aria-hidden="true"
          />
        </Link>
      </section>

      {/* 2. Bagian Koleksi Pilihan di Monitor Komputer */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-ink-muted mb-1">
              <Compass className="w-4 h-4 text-ink-muted" />
              <span>Rak Buku Perpustakaan</span>
            </div>
            <h3 className="font-serif text-3xl font-semibold text-ink">Koleksi Terpopuler</h3>
          </div>
          <p className="text-sm text-ink-muted">
            Status ketersediaan eksemplar terhubung langsung ke basis data server sekolah.
          </p>
        </div>

        {daftarBuku.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-16 text-center shadow-sm">
            <BookOpen className="w-12 h-12 text-ink-muted mx-auto mb-3" />
            <h4 className="font-serif text-xl font-semibold text-ink mb-1">
              Katalog Perpustakaan Belum Terisi
            </h4>
            <p className="text-ink-muted text-sm max-w-md mx-auto">
              Petugas perpustakaan belum memasukkan data buku. Buka Portal Admin untuk menambah buku baru.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-6">
            {daftarBuku.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2.5 p-3.5 rounded-lg bg-surface border border-line/80 hover:border-ink/40 hover:shadow-sm transition-all group"
              >
                <BookCover
                  judul={item.judul}
                  penulis={item.penulis}
                  kelompok={item.kelompok}
                  className="group-hover:scale-[1.02] transition-transform duration-200"
                />
                <div className="flex flex-col gap-1 mt-1">
                  <span className="font-mono text-[10px] text-ink-muted uppercase tracking-wider">
                    {item.kategoriNama}
                  </span>
                  <h4 className="font-serif font-semibold text-sm leading-tight text-ink line-clamp-2">
                    {item.judul}
                  </h4>
                  <p className="text-xs text-ink-muted line-clamp-1">{item.penulis}</p>

                  <BookSpineTick
                    total={item.totalEksemplar}
                    tersedia={item.tersediaEksemplar}
                    className="mt-2 pt-2 border-t border-line/60"
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
