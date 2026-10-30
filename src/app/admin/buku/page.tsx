import { Plus, Globe, Search, BookMarked } from "lucide-react";
import { db } from "@/db";
import { buku, kategori, eksemplar } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { BookSpineTick } from "@/components/ui/BookSpineTick";

export const dynamic = "force-dynamic";

export default async function AdminBukuPage() {
  let daftarBuku: Array<{
    id: string;
    judul: string;
    penulis: string;
    penerbit: string | null;
    kategoriNama: string;
    kelompok: string;
    totalEksemplar: number;
    tersediaEksemplar: number;
    lokasiRak: string | null;
  }> = [];

  try {
    const raw = await db
      .select({
        id: buku.id,
        judul: buku.judul,
        penulis: buku.penulis,
        penerbit: buku.penerbit,
        kategoriNama: kategori.nama,
        kelompok: kategori.kelompok,
        lokasiRak: buku.lokasiRak,
        totalEksemplar: sql<number>`count(${eksemplar.id})`,
        tersediaEksemplar: sql<number>`sum(case when ${eksemplar.status} = 'tersedia' then 1 else 0 end)`,
      })
      .from(buku)
      .innerJoin(kategori, eq(buku.kategoriId, kategori.id))
      .leftJoin(eksemplar, eq(buku.id, eksemplar.bukuId))
      .where(sql`${buku.dihapusPada} IS NULL`)
      .groupBy(buku.id, kategori.nama, kategori.kelompok);

    daftarBuku = raw.map((r) => ({
      id: r.id,
      judul: r.judul,
      penulis: r.penulis,
      penerbit: r.penerbit,
      kategoriNama: r.kategoriNama,
      kelompok: r.kelompok,
      lokasiRak: r.lokasiRak,
      totalEksemplar: Number(r.totalEksemplar || 0),
      tersediaEksemplar: Number(r.tersediaEksemplar || 0),
    }));
  } catch (error) {
    console.error("Gagal mengambil daftar buku:", error);
  }

  return (
    <div className="space-y-8">
      {/* Header Halaman Buku */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Katalog & Eksemplar Buku</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Kelola judul buku, nomor panggil rak, dan cetak label stiker QR eksemplar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-sm font-medium transition-colors min-h-[44px]">
            <Globe className="w-4 h-4 text-ink-muted" />
            <span>Cari Online (+)</span>
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink/90 transition-colors min-h-[44px]">
            <Plus className="w-4 h-4" />
            <span>Tambah Buku Manual</span>
          </button>
        </div>
      </div>

      {/* Tabel Koleksi Buku Admin */}
      <div className="bg-surface border border-line rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-serif font-semibold text-lg text-ink">Daftar Judul Terdaftar</h2>
          <span className="font-mono text-xs text-ink-muted">{daftarBuku.length} Judul Buku</span>
        </div>

        {daftarBuku.length === 0 ? (
          <div className="p-8 text-center text-ink-muted text-sm">
            Belum ada buku terdaftar di sistem. Klik tombol Tambah Buku Manual atau Cari Online untuk
            memulai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-sunken/60 text-ink font-mono uppercase tracking-wider border-b border-line">
                <tr>
                  <th className="py-3 px-4">Judul & Penulis</th>
                  <th className="py-3 px-4">Kelompok</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Rak</th>
                  <th className="py-3 px-4">Ketersediaan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {daftarBuku.map((item) => (
                  <tr key={item.id} className="hover:bg-paper-sunken/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-serif font-semibold text-sm text-ink block">
                        {item.judul}
                      </span>
                      <span className="text-ink-muted text-xs block">{item.penulis}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase text-white font-semibold ${
                          item.kelompok === "pelajaran" ? "bg-group-pelajaran" : "bg-group-hiburan"
                        }`}
                      >
                        {item.kelompok}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-ink">{item.kategoriNama}</td>
                    <td className="py-3.5 px-4 font-mono">{item.lokasiRak || "-"}</td>
                    <td className="py-3.5 px-4">
                      <BookSpineTick
                        total={item.totalEksemplar}
                        tersedia={item.tersediaEksemplar}
                        showText={true}
                      />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button className="px-3 py-1.5 rounded border border-line hover:bg-paper-sunken text-xs font-mono font-medium">
                        Cetak QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
