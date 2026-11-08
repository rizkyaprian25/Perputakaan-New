"use client";

/**
 * Perpustakaan NETRI - Grid Katalog Buku Interaktif (Publik)
 * Menampilkan daftar kartu buku yang saat diklik membuka Modal Detail Buku
 * lengkap dengan sampul, ISBN, penerbit, tahun terbit, lokasi rak, sinopsis, dan ketersediaan.
 */

import { useState } from "react";
import { BookCover } from "@/components/ui/BookCover";
import { BookSpineTick } from "@/components/ui/BookSpineTick";
import { X, MapPin, BookOpen, Calendar, Hash, Layers } from "lucide-react";

export interface ItemKatalogPublik {
  id: string;
  judul: string;
  penulis: string;
  penerbit?: string | null;
  tahunTerbit?: number | null;
  jumlahHalaman?: number | null;
  isbn?: string | null;
  sinopsis?: string | null;
  sampulUrl?: string | null;
  lokasiRak?: string | null;
  kelompok: "hiburan" | "pelajaran";
  kategoriNama: string;
  totalEksemplar: number;
  tersediaEksemplar: number;
}

interface BookCatalogGridProps {
  items: ItemKatalogPublik[];
}

export function BookCatalogGrid({ items }: BookCatalogGridProps) {
  const [selectedBook, setSelectedBook] = useState<ItemKatalogPublik | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedBook(item)}
            className="text-left flex flex-col gap-2.5 p-3.5 rounded-xl bg-surface border border-line/80 hover:border-ink/40 hover-lift group cursor-pointer"
          >
            <BookCover
              judul={item.judul}
              penulis={item.penulis}
              kelompok={item.kelompok}
              sampulUrl={item.sampulUrl}
              className="w-full group-hover:scale-[1.02] transition-transform duration-200"
            />
            <div className="flex flex-col gap-1 mt-1 w-full">
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[10px] text-ink-muted uppercase tracking-wider truncate">
                  {item.kategoriNama}
                </span>
                {item.lokasiRak && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-paper-sunken text-ink font-semibold shrink-0">
                    {item.lokasiRak}
                  </span>
                )}
              </div>
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
          </button>
        ))}
      </div>

      {/* Modal Detail Buku */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedBook(null)}
        >
          <div
            className="bg-surface border border-line rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <span
                  className={`inline-block font-mono text-[11px] uppercase px-2.5 py-0.5 rounded text-white font-semibold mb-2 ${
                    selectedBook.kelompok === "pelajaran"
                      ? "bg-group-pelajaran"
                      : "bg-group-hiburan"
                  }`}
                >
                  {selectedBook.kategoriNama}
                </span>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-ink leading-snug">
                  {selectedBook.judul}
                </h2>
                <p className="text-sm text-ink-muted font-medium mt-1">
                  Oleh <span className="text-ink">{selectedBook.penulis}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="p-1.5 rounded-lg border border-line text-ink-muted hover:text-ink hover:bg-paper-sunken"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Sampul Buku */}
              <div className="md:col-span-4 max-w-[200px] mx-auto w-full">
                <BookCover
                  judul={selectedBook.judul}
                  penulis={selectedBook.penulis}
                  kelompok={selectedBook.kelompok}
                  sampulUrl={selectedBook.sampulUrl}
                  className="shadow-md"
                />
              </div>

              {/* Informasi Bibliografi & Rak */}
              <div className="md:col-span-8 space-y-4">
                {/* Banner Lokasi Rak & Ketersediaan */}
                <div className="p-4 rounded-xl bg-paper-sunken/60 border border-line flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-ink text-paper flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono uppercase text-ink-muted block">
                        Lokasi Rak Fisik
                      </span>
                      <strong className="font-mono text-sm text-ink">
                        {selectedBook.lokasiRak || "Rak Utama Perpustakaan"}
                      </strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-mono uppercase text-ink-muted block">
                      Status Ketersediaan
                    </span>
                    <span
                      className={`font-mono text-sm font-bold ${
                        selectedBook.tersediaEksemplar > 0
                          ? "text-status-tersedia"
                          : "text-danger"
                      }`}
                    >
                      {selectedBook.tersediaEksemplar} dari {selectedBook.totalEksemplar} Eksemplar Tersedia
                    </span>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-line bg-paper/50">
                    <span className="text-ink-muted flex items-center gap-1.5 mb-1">
                      <Layers className="w-3.5 h-3.5" /> Penerbit
                    </span>
                    <strong className="text-ink font-medium">
                      {selectedBook.penerbit || "-"}
                    </strong>
                  </div>

                  <div className="p-3 rounded-lg border border-line bg-paper/50">
                    <span className="text-ink-muted flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5" /> Tahun Terbit
                    </span>
                    <strong className="font-mono text-ink">
                      {selectedBook.tahunTerbit || "-"}
                    </strong>
                  </div>

                  <div className="p-3 rounded-lg border border-line bg-paper/50">
                    <span className="text-ink-muted flex items-center gap-1.5 mb-1">
                      <Hash className="w-3.5 h-3.5" /> Nomor ISBN
                    </span>
                    <strong className="font-mono text-ink">
                      {selectedBook.isbn || "-"}
                    </strong>
                  </div>

                  <div className="p-3 rounded-lg border border-line bg-paper/50">
                    <span className="text-ink-muted flex items-center gap-1.5 mb-1">
                      <BookOpen className="w-3.5 h-3.5" /> Tebal Halaman
                    </span>
                    <strong className="font-mono text-ink">
                      {selectedBook.jumlahHalaman
                        ? `${selectedBook.jumlahHalaman} hlm`
                        : "-"}
                    </strong>
                  </div>
                </div>

                {/* Sinopsis */}
                <div className="space-y-1.5 pt-1">
                  <h4 className="font-mono text-xs uppercase font-bold text-ink-muted">
                    Ringkasan / Sinopsis Buku
                  </h4>
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
                    {selectedBook.sinopsis ||
                      "Belum ada deskripsi sinopsis untuk buku ini. Silakan kunjungi rak perpustakaan untuk melihat langsung."}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-line flex items-center justify-between text-xs text-ink-muted">
              <span>
                Ingin meminjam buku ini? Catat kode rak di atas dan bawa buku ke Meja Sirkulasi Petugas.
              </span>
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="px-5 py-2 rounded-lg bg-ink text-paper font-semibold hover:bg-ink/90 min-h-[38px]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
