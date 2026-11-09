"use client";

/**
 * Perpustakaan NETRI - Komponen Lemari Buku Digital Interaktif (Edisi Desktop Widescreen Landscape)
 * Terinspirasi dari estetika Otium Bookshelf yang diadaptasi ke tata letak Landscape Multi-Bilik (2-Column & Full-Width Bays).
 * Mendukung 3 Mode Tampilan:
 * 1. Punggung Buku (Book Spines) di atas papan kayu 3D + ornamen perpustakaan
 * 2. Sampul di Rak (Face-Out Covers) berdiri di atas papan kayu 3D
 * 3. Grid Katalog Klasik (Compact Card Grid)
 */

import { useState, useMemo, useEffect } from "react";
import { BookCover } from "@/components/ui/BookCover";
import { BookSpineTick } from "@/components/ui/BookSpineTick";
import { ItemKatalogPublik } from "@/components/ui/BookCatalogGrid";
import {
  X,
  MapPin,
  BookOpen,
  Calendar,
  Hash,
  Layers,
  LayoutGrid,
  Library,
  GalleryHorizontalEnd,
  CheckCircle2,
} from "lucide-react";

interface BookshelfCatalogProps {
  items: ItemKatalogPublik[];
  defaultViewMode?: "spines" | "faceout" | "grid";
  showGroupFilter?: boolean;
  judulLemari?: string;
}

// Palet warna punggung buku realistis & hangat (Khas perpustakaan klasik & Otium)
const PALET_PUNGGUNG_BUKU = [
  { bg: "from-[#1E3A5F] via-[#162C49] to-[#0F2036]", text: "#F8FAFC", accent: "#93C5FD" }, // Navy Klasik
  { bg: "from-[#8C2D19] via-[#702212] to-[#54180C]", text: "#FFF7ED", accent: "#FDBA74" }, // Terracotta Crimson
  { bg: "from-[#234E36] via-[#1B3D2A] to-[#122B1D]", text: "#F0FDF4", accent: "#86EFAC" }, // Forest Emerald
  { bg: "from-[#272522] via-[#1C1B18] to-[#121110]", text: "#F5F5F4", accent: "#D6D3D1" }, // Charcoal Onyx
  { bg: "from-[#6B4226] via-[#54331C] to-[#3D2413]", text: "#FEF3C7", accent: "#FCD34D" }, // Warm Leather
  { bg: "from-[#3B5998] via-[#2D4678] to-[#1F3156]", text: "#EFF6FF", accent: "#BFDBFE" }, // Royal Cobalt
  { bg: "from-[#B45309] via-[#92400E] to-[#78350F]", text: "#FFFBEB", accent: "#FDE68A" }, // Ochre Gold
  { bg: "from-[#4C3556] via-[#3B2844] to-[#291B30]", text: "#FAF5FF", accent: "#E9D5FF" }, // Deep Plum
  { bg: "from-[#3F624D] via-[#314D3C] to-[#23382B]", text: "#ECFDF5", accent: "#A7F3D0" }, // Sage Olive
  { bg: "from-[#9A3412] via-[#7C2D12] to-[#61210B]", text: "#FFEDD5", accent: "#FED7AA" }, // Burnt Sienna
];

// Hash deterministik dari string ID agar tinggi, tebal, dan warna punggung buku selalu konsisten
function hitungHash(teks: string): number {
  let h = 2166136261;
  for (let i = 0; i < teks.length; i++) {
    h ^= teks.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Ornamen Dekorasi Rak Perpustakaan (Pot Bunga, Jam Pasir, Lilin Baca, Pemberat Buku)
function OrnamenRakKayu({ varian }: { varian: number }) {
  const tipe = varian % 4;

  if (tipe === 0) {
    // 1. Pot Tanaman Bunga Biru (Persis Referensi Otium)
    return (
      <div
        className="shrink-0 flex flex-col items-center justify-end select-none pointer-events-none mx-2 opacity-95"
        title="Tanaman Meja Baca"
        aria-hidden="true"
      >
        <svg width="52" height="58" viewBox="0 0 52 58" fill="none">
          {/* Daun & Tangkai */}
          <path d="M26 36C26 26 17 20 12 18" stroke="#3F6E43" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M26 36C26 24 35 19 40 17" stroke="#3F6E43" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M26 36V13" stroke="#2F5933" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="18" cy="28" rx="6" ry="3" transform="rotate(-28 18 28)" fill="#4D8052" />
          <ellipse cx="34" cy="27" rx="6" ry="3" transform="rotate(28 34 27)" fill="#4D8052" />
          {/* Kelopak Bunga Biru */}
          <circle cx="12" cy="17" r="5.5" fill="#7CC0F7" />
          <circle cx="12" cy="17" r="2" fill="#FBBF24" />
          <circle cx="26" cy="11" r="6" fill="#60A5FA" />
          <circle cx="26" cy="11" r="2.2" fill="#FBBF24" />
          <circle cx="40" cy="16" r="5.5" fill="#7CC0F7" />
          <circle cx="40" cy="16" r="2" fill="#FBBF24" />
          {/* Pot Terakota */}
          <path d="M13 36H39L35.5 56H16.5L13 36Z" fill="#C87D4B" />
          <rect x="11" y="33" width="30" height="4.5" rx="2" fill="#DA8E5B" />
        </svg>
      </div>
    );
  }

  if (tipe === 1) {
    // 2. Jam Pasir Kayu Klasik (Persis Referensi Otium)
    return (
      <div
        className="shrink-0 flex flex-col items-center justify-end select-none pointer-events-none mx-3 opacity-95"
        title="Jam Pasir Waktu Baca"
        aria-hidden="true"
      >
        <svg width="36" height="56" viewBox="0 0 36 56" fill="none">
          <rect x="5" y="4" width="26" height="4" rx="1.5" fill="#6B4423" />
          <rect x="5" y="48" width="26" height="4" rx="1.5" fill="#6B4423" />
          <rect x="7" y="8" width="2.2" height="40" fill="#855831" />
          <rect x="26.8" y="8" width="2.2" height="40" fill="#855831" />
          {/* Kaca & Pasir */}
          <path
            d="M10 9H26L19.5 27.5C18.8 29 17.2 29 16.5 27.5L10 9Z"
            fill="#F9F4E8"
            stroke="#D6CBB5"
          />
          <path
            d="M10 47H26L19.5 28.5C18.8 27 17.2 27 16.5 28.5L10 47Z"
            fill="#F9F4E8"
            stroke="#D6CBB5"
          />
          <path d="M13 18H23L18 27L13 18Z" fill="#DEB878" />
          <path d="M11.5 46.5H24.5L18 37L11.5 46.5Z" fill="#DEB878" />
          <line x1="18" y1="27" x2="18" y2="39" stroke="#DEB878" strokeWidth="1.3" strokeDasharray="2 1" />
        </svg>
      </div>
    );
  }

  if (tipe === 2) {
    // 3. Lilin Baca Hangat (Persis Referensi Otium)
    return (
      <div
        className="shrink-0 flex flex-col items-center justify-end select-none pointer-events-none mx-3 opacity-95"
        title="Lilin Sudut Literasi"
        aria-hidden="true"
      >
        <svg width="30" height="54" viewBox="0 0 30 54" fill="none">
          {/* Cahaya & Api */}
          <circle cx="15" cy="12" r="8" fill="#FDE68A" fillOpacity="0.45" />
          <path
            d="M15 4C15 4 20 10 18.5 15C17.5 18 12.5 18 11.5 15C10 10 15 4 15 4Z"
            fill="#F59E0B"
          />
          <path
            d="M15 8C15 8 17.5 12 16.8 14.8C16.2 16.5 13.8 16.5 13.2 14.8C12.5 12 15 8 15 8Z"
            fill="#FEF08A"
          />
          <line x1="15" y1="17" x2="15" y2="20" stroke="#292524" strokeWidth="1.5" />
          {/* Batang Lilin */}
          <rect x="9" y="20" width="12" height="30" rx="2" fill="#FBF8F1" stroke="#E4DCCB" />
          <ellipse cx="15" cy="51" rx="10" ry="2.5" fill="#B48A5A" />
        </svg>
      </div>
    );
  }

  // 4. Tumpukan Mini Buku Horizontal & Bola Dunia Kecil
  return (
    <div
      className="shrink-0 flex items-end gap-1.5 select-none pointer-events-none mx-2 opacity-95"
      title="Koleksi Referensi"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center">
        <div className="w-11 h-2.5 rounded-xs bg-[#8C2D19] border border-black/20 shadow-2xs" />
        <div className="w-13 h-3 rounded-xs bg-[#1E3A5F] border border-black/20 shadow-2xs" />
        <div className="w-14 h-3.5 rounded-xs bg-[#234E36] border border-black/20 shadow-2xs" />
      </div>
    </div>
  );
}

export function BookshelfCatalog({
  items,
  defaultViewMode = "faceout",
  showGroupFilter = true,
  judulLemari,
}: BookshelfCatalogProps) {
  const [viewMode, setViewMode] = useState<"spines" | "faceout" | "grid">(defaultViewMode);
  const [filterKelompok, setFilterKelompok] = useState<"semua" | "hiburan" | "pelajaran">("semua");
  const [filterHanyaTersedia, setFilterHanyaTersedia] = useState(false);
  const [selectedBook, setSelectedBook] = useState<ItemKatalogPublik | null>(null);

  // Ingat preferensi tampilan rak pengguna (default: faceout / Sampul di Rak 100%)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("netri_bookshelf_mode_v2") as
        | "spines"
        | "faceout"
        | "grid"
        | null;
      if (saved === "spines" || saved === "faceout" || saved === "grid") {
        setViewMode(saved);
      } else {
        setViewMode(defaultViewMode);
      }
    } catch {
      // Abaikan
    }
  }, [defaultViewMode]);

  const gantiModeTampilan = (mode: "spines" | "faceout" | "grid") => {
    setViewMode(mode);
    try {
      localStorage.setItem("netri_bookshelf_mode_v2", mode);
    } catch {
      // Abaikan
    }
  };

  // Saring buku sesuai filter kelompok dan ketersediaan
  const bukuTersaring = useMemo(() => {
    return items.filter((b) => {
      if (filterKelompok !== "semua" && b.kelompok !== filterKelompok) return false;
      if (filterHanyaTersedia && b.tersediaEksemplar <= 0) return false;
      return true;
    });
  }, [items, filterKelompok, filterHanyaTersedia]);

  // Kelompokkan buku ke dalam Rak Kategori (Shelves)
  const daftarRakKategori = useMemo(() => {
    const mapRak = new Map<
      string,
      {
        namaKategori: string;
        kelompok: "hiburan" | "pelajaran";
        kodeRakDominan: string;
        bukuList: ItemKatalogPublik[];
      }
    >();

    for (const b of bukuTersaring) {
      const key = `${b.kelompok}::${b.kategoriNama}`;
      const ada = mapRak.get(key);
      if (ada) {
        ada.bukuList.push(b);
        if (!ada.kodeRakDominan && b.lokasiRak) {
          ada.kodeRakDominan = b.lokasiRak;
        }
      } else {
        mapRak.set(key, {
          namaKategori: b.kategoriNama || "Koleksi Umum",
          kelompok: b.kelompok,
          kodeRakDominan: b.lokasiRak || (b.kelompok === "pelajaran" ? "Rak P-01" : "Rak R-01"),
          bukuList: [b],
        });
      }
    }

    return Array.from(mapRak.values()).sort((a, b) => b.bukuList.length - a.bukuList.length);
  }, [bukuTersaring]);

  // Statistik Mahkota Atas Lemari (persis panel statistik di atas lemari pada referensi Otium, namun Landscape)
  const statistikLemari = useMemo(() => {
    const totalJudul = bukuTersaring.length;
    const totalEksemplar = bukuTersaring.reduce((acc, b) => acc + b.totalEksemplar, 0);
    const totalTersedia = bukuTersaring.reduce((acc, b) => acc + b.tersediaEksemplar, 0);
    const persenTersedia =
      totalEksemplar > 0 ? Math.round((totalTersedia / totalEksemplar) * 100) : 100;
    const kategoriFavorit = daftarRakKategori[0]?.namaKategori || "Literasi Umum";

    return {
      totalJudul,
      totalEksemplar,
      totalTersedia,
      persenTersedia,
      jumlahRak: daftarRakKategori.length,
      kategoriFavorit,
    };
  }, [bukuTersaring, daftarRakKategori]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. KABINET LEMARI BUKU DIGITAL WIDESCREEN LANDSCAPE                       */}
      {/* ========================================================================= */}
      <div className="bookcase-wall-landscape rounded-3xl p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Mahkota Atas Lemari (Landscape Top Crown: Statistik + Kontrol Mode Rak) */}
        <div className="bg-surface/95 backdrop-blur-xs border border-[#DFD5C3] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 items-center">
            {/* 4 Kolom Statistik Bergaya Otium di Sisi Kiri-Tengah (7 Kolom Grid) */}
            <div className="col-span-2 lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-line border border-line/70 rounded-xl bg-paper/60">
              <div className="p-3 text-center">
                <span className="font-serif font-extrabold text-xl sm:text-2xl text-group-hiburan block leading-none tabular-nums">
                  {statistikLemari.totalJudul}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted mt-1 block">
                  Judul di Lemari
                </span>
              </div>

              <div className="p-3 text-center">
                <span className="font-serif font-extrabold text-xl sm:text-2xl text-status-tersedia block leading-none tabular-nums">
                  {statistikLemari.persenTersedia}%
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted mt-1 block">
                  Siap Dipinjam ({statistikLemari.totalTersedia})
                </span>
              </div>

              <div className="p-3 text-center">
                <span className="font-serif font-extrabold text-xl sm:text-2xl text-group-pelajaran block leading-none tabular-nums">
                  {statistikLemari.jumlahRak}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted mt-1 block">
                  Rak Kategori
                </span>
              </div>

              <div className="p-3 text-center min-w-0">
                <span className="font-serif font-bold text-sm sm:text-base text-ink truncate block leading-tight">
                  {statistikLemari.kategoriFavorit}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted mt-1 block">
                  Rak Terbanyak
                </span>
              </div>
            </div>

            {/* Kontrol Mode Tampilan Rak di Sisi Kanan (5 Kolom Grid) */}
            <div className="col-span-2 lg:col-span-5 flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
              {/* Sakelar 3 Mode Tampilan Lemari */}
              <div
                className="inline-flex items-center p-1 rounded-xl bg-[#EAE2D3] border border-[#D5C9B4]"
                role="group"
                aria-label="Pilih Mode Tampilan Lemari Buku"
              >
                <button
                  type="button"
                  onClick={() => gantiModeTampilan("faceout")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "faceout"
                      ? "bg-ink text-paper shadow-xs"
                      : "text-ink-muted hover:text-ink"
                  }`}
                  title="Tampilan Sampul Buku Berdiri di Atas Rak Kayu (Maks. 3 Buku per Baris)"
                >
                  <GalleryHorizontalEnd className="w-3.5 h-3.5" />
                  <span>Sampul di Rak</span>
                </button>

                <button
                  type="button"
                  onClick={() => gantiModeTampilan("spines")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "spines"
                      ? "bg-ink text-paper shadow-xs"
                      : "text-ink-muted hover:text-ink"
                  }`}
                  title="Tampilan Punggung Buku Berjajar di Rak Kayu (Gaya Otium)"
                >
                  <Library className="w-3.5 h-3.5" />
                  <span>Punggung Buku</span>
                </button>

                <button
                  type="button"
                  onClick={() => gantiModeTampilan("grid")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "grid"
                      ? "bg-ink text-paper shadow-xs"
                      : "text-ink-muted hover:text-ink"
                  }`}
                  title="Tampilan Kartu Katalog Standar"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid Kartu</span>
                </button>
              </div>
            </div>
          </div>

          {/* Baris Kedua Mahkota Lemari: Filter Cepat Kelompok + Status Ketersediaan + Info Hover */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line/70 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {judulLemari && (
                <span className="font-serif font-bold text-sm text-ink mr-2">{judulLemari}:</span>
              )}

              {showGroupFilter && (
                <>
                  <button
                    type="button"
                    onClick={() => setFilterKelompok("semua")}
                    className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                      filterKelompok === "semua"
                        ? "bg-ink text-paper"
                        : "bg-paper-sunken text-ink-muted hover:text-ink"
                    }`}
                  >
                    Semua Lemari ({items.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterKelompok("hiburan")}
                    className={`px-3 py-1 rounded-full font-semibold inline-flex items-center gap-1.5 transition-colors ${
                      filterKelompok === "hiburan"
                        ? "bg-group-hiburan text-white"
                        : "bg-paper-sunken text-ink-muted hover:text-ink"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    <span>Bacaan Hiburan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterKelompok("pelajaran")}
                    className={`px-3 py-1 rounded-full font-semibold inline-flex items-center gap-1.5 transition-colors ${
                      filterKelompok === "pelajaran"
                        ? "bg-group-pelajaran text-white"
                        : "bg-paper-sunken text-ink-muted hover:text-ink"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    <span>Buku Pelajaran</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setFilterHanyaTersedia(!filterHanyaTersedia)}
                className={`px-3 py-1 rounded-full font-semibold inline-flex items-center gap-1.5 border transition-colors ${
                  filterHanyaTersedia
                    ? "bg-status-tersedia text-white border-status-tersedia"
                    : "bg-white border-line text-ink-muted hover:text-ink"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hanya yang Ada di Rak</span>
              </button>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* ISI LEMARI BUKU: DINDING MULTI-BILIK LANDSCAPE (2 KOLOM SEJAJAR)       */}
        {/* ===================================================================== */}
        {bukuTersaring.length === 0 ? (
          <div className="bookshelf-bay-alcove rounded-2xl p-14 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-ink-muted mx-auto stroke-[1.5]" />
            <h4 className="font-serif font-bold text-lg text-ink">
              Rak Lemari untuk Filter Ini Masih Kosong
            </h4>
            <p className="text-xs text-ink-muted">
              Coba matikan filter &ldquo;Hanya yang Ada di Rak&rdquo; atau pilih kelompok koleksi lainnya.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* MODE 3: GRID KARTU KATALOG KLASIK */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {bukuTersaring.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedBook(item)}
                className="text-left flex flex-col gap-2.5 p-3.5 rounded-xl bg-surface border border-line/80 hover:border-ink/40 hover-lift group cursor-pointer shadow-xs"
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
        ) : (
          /* MODE 1 (PUNGGUNG BUKU / SPINES) & MODE 2 (SAMPUL DI RAK / FACE-OUT)
             Disusun dalam Grid 2 Bilik Lemari Sejajar Horizontal (Landscape 16:9) */
          <div
            className={
              daftarRakKategori.length === 1
                ? "max-w-2xl mx-auto w-full"
                : "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
            }
          >
            {daftarRakKategori.map((rak, rakIdx) => {
              // Untuk mode punggung buku (spines) jika bukunya sangat banyak (>14), bentangkan bilik
              const bentangPenuh =
                daftarRakKategori.length === 1 ||
                (viewMode === "spines" && rak.bukuList.length > 14);

              const jumlahTersediaRak = rak.bukuList.filter(
                (b) => b.tersediaEksemplar > 0
              ).length;

              return (
                <div
                  key={`${rak.kelompok}-${rak.namaKategori}`}
                  className={`bookshelf-bay-alcove rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all ${
                    bentangPenuh && daftarRakKategori.length > 1 ? "lg:col-span-2" : "w-full"
                  }`}
                >
                  {/* 1. Pita Label Kategori di Puncak Ceruk Rak (Shelf Header Pill - Persis Otium) */}
                  <div className="shelf-header-pill rounded-xl px-4 py-2.5 mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          rak.kelompok === "pelajaran"
                            ? "bg-group-pelajaran"
                            : "bg-group-hiburan"
                        }`}
                      />
                      <h4 className="font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider text-ink truncate">
                        {rak.namaKategori}
                      </h4>
                      <span className="hidden sm:inline-block font-mono text-[11px] text-ink-muted">
                        • {rak.kelompok === "pelajaran" ? "Pelajaran" : "Bacaan"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] font-semibold text-ink-muted bg-white/80 px-2.5 py-0.5 rounded-full border border-[#D8CEB8]">
                        {rak.kodeRakDominan}
                      </span>
                      <span
                        className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-white text-ink border border-[#D8CEB8] shadow-2xs tabular-nums"
                        title={`${jumlahTersediaRak} dari ${rak.bukuList.length} judul tersedia di rak`}
                      >
                        {rak.bukuList.length}
                      </span>
                    </div>
                  </div>

                  {/* 2. Area Berdiri Buku + Papan Kayu Penyangga 3D */}
                  <div className="mt-auto">
                    {viewMode === "spines" ? (
                      /* ========================================================= */
                      /* TAMPILAN 1: DERETAN PUNGGUNG BUKU (BOOK SPINES VIEW)       */
                      /* ========================================================= */
                      <div className="px-3 sm:px-5 pt-4 flex items-end justify-start gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none min-h-[228px]">
                        {rak.bukuList.map((bukuItem) => {
                          const h = hitungHash(bukuItem.id + bukuItem.judul);
                          const palet =
                            bukuItem.kelompok === "pelajaran"
                              ? PALET_PUNGGUNG_BUKU[(h % 3) * 2] // Dominan warna biru/hijau/klasik untuk pelajaran
                              : PALET_PUNGGUNG_BUKU[h % PALET_PUNGGUNG_BUKU.length];

                          // Variasi tinggi (176px - 216px) & ketebalan punggung (38px - 54px) secara proporsional
                          const tinggiPx = 178 + (h % 38);
                          const halaman = bukuItem.jumlahHalaman || 180;
                          const lebarPx = Math.min(
                            54,
                            Math.max(38, Math.round(36 + (halaman % 18)))
                          );
                          const tersedia = bukuItem.tersediaEksemplar > 0;

                          return (
                            <button
                              key={bukuItem.id}
                              type="button"
                              onClick={() => setSelectedBook(bukuItem)}
                              style={{
                                height: `${tinggiPx}px`,
                                width: `${lebarPx}px`,
                              }}
                              title={`${bukuItem.judul} — ${bukuItem.penulis} (${
                                tersedia
                                  ? `${bukuItem.tersediaEksemplar} tersedia di ${
                                      bukuItem.lokasiRak || "Rak"
                                    }`
                                  : "Sedang dipinjam semua"
                              })`}
                              className={`spine-book-item group relative shrink-0 rounded-t-[5px] rounded-b-[2px] bg-gradient-to-r ${palet.bg} flex flex-col items-center justify-between py-2.5 px-1 cursor-pointer select-none border-t border-white/25 ${
                                !tersedia ? "opacity-65 saturate-50" : ""
                              }`}
                            >
                              {/* Pita Dekoratif Atas Punggung Buku & Indikator Ketersediaan */}
                              <div className="w-full flex flex-col items-center gap-1 border-b border-white/15 pb-1.5 shrink-0">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    tersedia
                                      ? "bg-[#4ADE80] shadow-[0_0_6px_rgba(74,222,128,0.9)]"
                                      : "bg-amber-400/80"
                                  }`}
                                />
                                <span
                                  className="font-mono text-[8px] font-bold tracking-tighter uppercase opacity-80 truncate max-w-full"
                                  style={{ color: palet.accent }}
                                >
                                  {(bukuItem.lokasiRak || "R1").replace(/^Rak\s+/i, "")}
                                </span>
                              </div>

                              {/* Judul Vertikal di Sepanjang Punggung Buku */}
                              <div className="flex-1 min-h-0 flex items-center justify-center py-1 overflow-hidden">
                                <span
                                  className="spine-vertical-text font-serif font-bold text-[11px] sm:text-xs tracking-wide leading-none line-clamp-1 max-h-full"
                                  style={{ color: palet.text }}
                                >
                                  {bukuItem.judul}
                                </span>
                              </div>

                              {/* Miniatur Sampul / Inisial Penulis di Bagian Bawah Punggung (Persis gaya buku Otium) */}
                              <div className="w-full pt-1.5 border-t border-white/15 flex flex-col items-center gap-1 shrink-0">
                                {bukuItem.sampulUrl ? (
                                  <div className="w-6 h-8 rounded-[2px] overflow-hidden border border-white/30 shadow-2xs bg-black/20">
                                    <img
                                      src={bukuItem.sampulUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                ) : (
                                  <span
                                    className="font-mono text-[8px] uppercase font-semibold opacity-75 truncate max-w-full px-0.5"
                                    style={{ color: palet.accent }}
                                  >
                                    {bukuItem.penulis.split(" ")[0]}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}

                        {/* Ornamen Perpustakaan di Ujung Kanan Papan Kayu (Pot Tanaman / Jam Pasir / Lilin) */}
                        <div className="ml-auto pl-3 flex items-end">
                          <OrnamenRakKayu varian={rakIdx} />
                        </div>
                      </div>
                    ) : (
                      /* ========================================================= */
                      /* TAMPILAN 2: SAMPUL BUKU BERDIRI DI ATAS RAK KAYU (FACE-OUT)*/
                      /* Multi-Tier Bertingkat: Maksimal 3 Buku per Baris / Papan */
                      /* Bebas 100% dari Scroll Kanan-Kiri                         */
                      /* ========================================================= */
                      <div className="space-y-4">
                        {(() => {
                          const barisTingkatBuku: ItemKatalogPublik[][] = [];
                          for (let i = 0; i < rak.bukuList.length; i += 3) {
                            barisTingkatBuku.push(rak.bukuList.slice(i, i + 3));
                          }

                          return barisTingkatBuku.map((chunk, tierIdx) => (
                            <div key={tierIdx} className="space-y-0">
                              <div className="px-1 sm:px-3 pt-3 flex items-end justify-start gap-2.5 sm:gap-4 md:gap-5 min-h-[205px] overflow-hidden">
                                {chunk.map((bukuItem) => {
                                  const tersedia = bukuItem.tersediaEksemplar > 0;
                                  return (
                                    <button
                                      key={bukuItem.id}
                                      type="button"
                                      onClick={() => setSelectedBook(bukuItem)}
                                      className="faceout-book-item group relative shrink-0 w-[96px] xs:w-[108px] sm:w-[126px] md:w-[136px] rounded-t-md overflow-hidden cursor-pointer text-left bg-surface"
                                    >
                                      <BookCover
                                        judul={bukuItem.judul}
                                        penulis={bukuItem.penulis}
                                        kelompok={bukuItem.kelompok}
                                        sampulUrl={bukuItem.sampulUrl}
                                        className="w-full rounded-none rounded-t-md border-b-0 p-2 sm:p-3 text-[10px] sm:text-xs"
                                      />
                                      {/* Pita Status Ketersediaan & Lokasi Rak di Kaki Sampul */}
                                      <div className="bg-ink/90 text-paper px-1.5 sm:px-2 py-1 flex items-center justify-between text-[9px] sm:text-[10px] font-mono">
                                        <span className="truncate max-w-[55px] sm:max-w-[70px]">
                                          {bukuItem.lokasiRak || "Rak"}
                                        </span>
                                        <span
                                          className={`px-1 sm:px-1.5 py-0.2 rounded font-bold ${
                                            tersedia
                                              ? "bg-status-tersedia text-white"
                                              : "bg-danger text-white"
                                          }`}
                                        >
                                          {bukuItem.tersediaEksemplar}/{bukuItem.totalEksemplar}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}

                                {/* Ornamen Perpustakaan Klasik di Ujung Kanan bila Tersisa Ruang Kosong */}
                                {chunk.length < 3 && (
                                  <div className="ml-auto pl-1 sm:pl-2 flex items-end">
                                    <OrnamenRakKayu varian={rakIdx + tierIdx + 1} />
                                  </div>
                                )}
                              </div>

                              {/* Papan Kayu Penyangga 3D untuk Baris / Tingkat Rak Ini */}
                              <div className="wooden-plank-3d rounded-md w-full" />
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {/* 3. Papan Kayu Penyangga 3D untuk Mode Punggung Buku (Spines) */}
                    {viewMode === "spines" && (
                      <div className="wooden-plank-3d rounded-md w-full" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. MODAL DETAIL BUKU LANDSCAPE (SAAT BUKU DI RAK DIKLIK)                  */}
      {/* ========================================================================= */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 bg-ink/55 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
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
                      {selectedBook.jumlahHalaman ? `${selectedBook.jumlahHalaman} hlm` : "-"}
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
    </div>
  );
}
