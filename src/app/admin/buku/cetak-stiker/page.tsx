"use client";

/**
 * Perpustakaan NETRI - Sistem Cetak Stiker QR Buku (Per-Eksemplar, Per-Buku, & Cetak Massal A4)
 * Dirancang dengan presisi milimeter (3 kolom x 8 baris = 24 stiker per lembar A4)
 * serta bebas 100% dari elemen navigasi/katalog web saat dicetak.
 */

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Printer,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Search,
  CheckSquare,
  Square,
  BookOpen,
  Layers,
} from "lucide-react";

interface StikerEksemplarItem {
  eksemplarId: string;
  kode: string;
  status: string;
  bukuId: string;
  judul: string;
  penulis: string;
  isbn: string | null;
  lokasiRak: string | null;
  kategoriNama: string;
  kelompok: "hiburan" | "pelajaran";
}

function CetakStikerBukuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paramBukuId = searchParams.get("bukuId") || "";
  const paramIds = searchParams.get("ids") || "";
  const paramAutoPrint = searchParams.get("autoprint") === "true";

  const [semuaStiker, setSemuaStiker] = useState<StikerEksemplarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Kontrol Pilihan Stiker
  const [filterBukuId, setFilterBukuId] = useState<string>(paramBukuId || "semua");
  const [filterKelompok, setFilterKelompok] = useState<"semua" | "hiburan" | "pelajaran">("semua");
  const [kataKunci, setKataKunci] = useState("");
  const [idTerpilih, setIdTerpilih] = useState<Set<string>>(new Set());

  useEffect(() => {
    const muatSeluruhStiker = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/admin/buku?mode=stiker_massal");
        const json = await res.json();

        if (!res.ok || !json.sukses) {
          throw new Error(json.pesan || "Gagal memuat data eksemplar buku");
        }

        const data: StikerEksemplarItem[] = json.data || [];
        setSemuaStiker(data);

        // Tentukan stiker mana yang otomatis dicentang saat halaman dibuka
        if (paramIds) {
          const spesifikIds = new Set(paramIds.split(",").filter(Boolean));
          setIdTerpilih(spesifikIds);
        } else if (paramBukuId) {
          const milikBuku = data
            .filter((item) => item.bukuId === paramBukuId)
            .map((item) => item.eksemplarId);
          setIdTerpilih(new Set(milikBuku));
        } else {
          setIdTerpilih(new Set(data.map((item) => item.eksemplarId)));
        }
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat menyiapkan lembar stiker");
      } finally {
        setLoading(false);
      }
    };

    muatSeluruhStiker();
  }, [paramBukuId, paramIds]);

  // Daftar judul buku unik untuk dropdown filter per-buku
  const daftarJudulUnik = useMemo(() => {
    const map = new Map<string, { bukuId: string; judul: string; jumlah: number }>();
    for (const item of semuaStiker) {
      const existing = map.get(item.bukuId);
      if (existing) {
        existing.jumlah += 1;
      } else {
        map.set(item.bukuId, { bukuId: item.bukuId, judul: item.judul, jumlah: 1 });
      }
    }
    return Array.from(map.values());
  }, [semuaStiker]);

  // Daftar stiker yang tampil sesuai filter
  const stikerTerfilter = useMemo(() => {
    return semuaStiker.filter((item) => {
      if (filterBukuId !== "semua" && item.bukuId !== filterBukuId) return false;
      if (filterKelompok !== "semua" && item.kelompok !== filterKelompok) return false;
      if (kataKunci.trim()) {
        const q = kataKunci.toLowerCase();
        return (
          item.judul.toLowerCase().includes(q) ||
          item.kode.toLowerCase().includes(q) ||
          item.penulis.toLowerCase().includes(q) ||
          (item.lokasiRak || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [semuaStiker, filterBukuId, filterKelompok, kataKunci]);

  // Stiker yang benar-benar akan dicetak (terfilter DAN tercentang)
  const stikerSiapCetak = useMemo(() => {
    return stikerTerfilter.filter((item) => idTerpilih.has(item.eksemplarId));
  }, [stikerTerfilter, idTerpilih]);

  // Saat pengguna mengganti dropdown Buku, otomatis centang semua eksemplar buku tersebut
  const handleGantiBuku = (bukuIdBaru: string) => {
    setFilterBukuId(bukuIdBaru);
    if (bukuIdBaru === "semua") {
      setIdTerpilih(new Set(semuaStiker.map((s) => s.eksemplarId)));
    } else {
      const milikBuku = semuaStiker
        .filter((s) => s.bukuId === bukuIdBaru)
        .map((s) => s.eksemplarId);
      setIdTerpilih(new Set(milikBuku));
    }
  };

  const togglePilihSatu = (eksemplarId: string) => {
    setIdTerpilih((prev) => {
      const next = new Set(prev);
      if (next.has(eksemplarId)) {
        next.delete(eksemplarId);
      } else {
        next.add(eksemplarId);
      }
      return next;
    });
  };

  const pilihSemuaTerfilter = () => {
    setIdTerpilih((prev) => {
      const next = new Set(prev);
      for (const item of stikerTerfilter) {
        next.add(item.eksemplarId);
      }
      return next;
    });
  };

  const kosongkanTerfilter = () => {
    setIdTerpilih((prev) => {
      const next = new Set(prev);
      for (const item of stikerTerfilter) {
        next.delete(item.eksemplarId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (paramAutoPrint && !loading && stikerSiapCetak.length > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [paramAutoPrint, loading, stikerSiapCetak.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
        <p className="font-sans text-sm text-ink-muted">
          Menyiapkan tata letak lembar stiker QR buku...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-bold text-xl text-ink">Gagal Menyiapkan Stiker</h2>
        <p className="font-sans text-sm text-ink-muted max-w-md">{error}</p>
        <button
          onClick={() => router.push("/admin/buku")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Buku</span>
        </button>
      </div>
    );
  }

  const estimasiHalamanA4 = Math.max(1, Math.ceil(stikerSiapCetak.length / 24));

  return (
    <div className="min-h-screen bg-paper-sunken/60 print:bg-white py-6 px-4 sm:px-8 print:p-0">
      {/* ===================================================================== */}
      {/* PANEL KONTROL CETAK (OTOMATIS HILANG 100% SAAT DICETAK KE KERTAS/PDF) */}
      {/* ===================================================================== */}
      <div className="max-w-[210mm] mx-auto mb-6 bg-surface border border-line rounded-2xl p-5 shadow-sm space-y-4 print:hidden">
        {/* Baris Atas: Judul & Tombol Cetak Utama */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/buku")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line bg-paper hover:bg-paper-sunken text-ink text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Katalog</span>
            </button>
            <div>
              <h1 className="font-serif font-bold text-lg text-ink">
                Cetak Stiker QR Buku (Per-Buku & Massal A4)
              </h1>
              <p className="font-sans text-xs text-ink-muted">
                Siap cetak <strong>{stikerSiapCetak.length} stiker</strong> (~{estimasiHalamanA4} lembar A4 • 24 stiker/halaman)
              </p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            disabled={stikerSiapCetak.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 shadow-sm disabled:opacity-40 transition-all min-h-[42px]"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak {stikerSiapCetak.length} Stiker QR Sekarang</span>
          </button>
        </div>

        {/* Baris Filter: Pilih Per-Buku / Massal, Kelompok, dan Pencarian */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Dropdown Pilih Judul Buku (Per-Buku vs Semua Koleksi) */}
          <div className="sm:col-span-5">
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">
              Mode Cetak (Per-Buku / Massal Semua Buku):
            </label>
            <select
              value={filterBukuId}
              onChange={(e) => handleGantiBuku(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-line bg-white text-xs font-medium text-ink focus:border-ink min-h-[38px]"
            >
              <option value="semua">
                📚 Cetak Massal Semua Judul Buku ({semuaStiker.length} Eksemplar)
              </option>
              {daftarJudulUnik.map((b) => (
                <option key={b.bukuId} value={b.bukuId}>
                  📖 {b.judul} ({b.jumlah} Stiker)
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelompok */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">
              Filter Kelompok:
            </label>
            <select
              value={filterKelompok}
              onChange={(e) => setFilterKelompok(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-line bg-white text-xs font-medium text-ink focus:border-ink min-h-[38px]"
            >
              <option value="semua">Semua Kelompok</option>
              <option value="pelajaran">Buku Pelajaran</option>
              <option value="hiburan">Bacaan Hiburan</option>
            </select>
          </div>

          {/* Pencarian Cepat */}
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">
              Cari Kode / Judul / Rak:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={kataKunci}
                onChange={(e) => setKataKunci(e.target.value)}
                placeholder="Ketik kode BB-... atau judul..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-line bg-white text-xs text-ink focus:border-ink min-h-[38px]"
              />
            </div>
          </div>
        </div>

        {/* Baris Pilih Cepat Eksemplar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60 text-xs">
          <div className="flex items-center gap-2 text-ink-muted">
            <span>Klik pada stiker di bawah untuk memilih/membatalkan unit tertentu:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={pilihSemuaTerfilter}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-line bg-paper hover:bg-paper-sunken text-ink font-medium"
            >
              <CheckSquare className="w-3.5 h-3.5 text-status-tersedia" />
              <span>Pilih Semua ({stikerTerfilter.length})</span>
            </button>
            <button
              type="button"
              onClick={kosongkanTerfilter}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-line bg-paper hover:bg-paper-sunken text-ink-muted hover:text-ink font-medium"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Kosongkan Pilihan</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* KANVAS KERTAS A4 STIKER QR BUKU (MURNI HANYA STIKER SAAT DICETAK)     */}
      {/* ===================================================================== */}
      {stikerSiapCetak.length === 0 ? (
        <div className="max-w-[210mm] mx-auto bg-white border border-line rounded-2xl p-12 text-center space-y-3 print:hidden">
          <BookOpen className="w-8 h-8 text-ink-muted mx-auto stroke-[1.5]" />
          <p className="text-sm font-medium text-ink">Belum ada stiker eksemplar yang dipilih untuk dicetak.</p>
          <p className="text-xs text-ink-muted">
            Klik tombol <strong>Pilih Semua</strong> di atas atau pilih judul buku dari daftar.
          </p>
        </div>
      ) : (
        <div className="max-w-[210mm] mx-auto bg-white shadow-md rounded-xl p-[8mm] print:shadow-none print:rounded-none print:p-0 print:max-w-none print:w-full">
          {/* Grid Presisi 3 Kolom Standar Kertas Stiker A4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-[3mm]">
            {stikerTerfilter.map((eks) => {
              const terpilih = idTerpilih.has(eks.eksemplarId);
              return (
                <div
                  key={eks.eksemplarId}
                  onClick={() => togglePilihSatu(eks.eksemplarId)}
                  title="Klik untuk memilih / membatalkan stiker ini"
                  className={`cursor-pointer select-none border border-dashed transition-all break-inside-avoid flex flex-col justify-between overflow-hidden bg-white ${
                    terpilih
                      ? "border-neutral-700 ring-1 ring-ink/10 print:ring-0 print:border-black"
                      : "opacity-35 border-neutral-300 print:hidden"
                  }`}
                  style={{ height: "32mm" }}
                >
                  {/* 1. Kop Hitam Stiker Punggung/Sampul Buku */}
                  <div
                    className="bg-black text-white px-[2.5mm] flex items-center justify-between shrink-0"
                    style={{ height: "5.5mm" }}
                  >
                    <span className="font-sans font-bold text-[6.5pt] tracking-wider uppercase leading-none">
                      PERPUSTAKAAN NETRI
                    </span>
                    <span className="font-mono font-bold text-[6.5pt] tracking-tight uppercase leading-none">
                      RAK: {eks.lokasiRak || "UMUM"}
                    </span>
                  </div>

                  {/* 2. Isi Utama Stiker: QR Code + Kode Inventaris & Judul */}
                  <div
                    className="flex items-center gap-[2.5mm] px-[2mm] py-[1.5mm] flex-1 min-h-0 bg-white"
                    style={{ height: "26.5mm" }}
                  >
                    {/* Kotak QR Code Presisi */}
                    <div
                      className="border border-black bg-white p-[0.8mm] shrink-0 flex items-center justify-center"
                      style={{ width: "21mm", height: "21mm" }}
                    >
                      <img
                        src={`/api/v1/admin/qr?tipe=buku&id=${eks.eksemplarId}`}
                        alt={eks.kode}
                        className="w-full h-full object-contain block"
                      />
                    </div>

                    {/* Rincian Teks Buku */}
                    <div className="min-w-0 flex-1 flex flex-col justify-between h-[21mm] py-[0.3mm]">
                      {/* Kode Barcode Eksemplar */}
                      <div className="border-b border-black/40 pb-[0.8mm]">
                        <span className="font-mono font-extrabold text-[9.5pt] text-black tracking-tight block leading-none">
                          {eks.kode}
                        </span>
                      </div>

                      {/* Judul Buku (Maksimal 2 Baris Rapi) */}
                      <p className="font-serif font-bold text-[7.5pt] text-black leading-[1.15] line-clamp-2 my-auto">
                        {eks.judul}
                      </p>

                      {/* Penulis & Kategori */}
                      <div className="flex items-center justify-between gap-1 pt-[0.5mm] border-t border-black/15">
                        <span className="font-sans text-[6pt] text-neutral-700 truncate">
                          {eks.penulis}
                        </span>
                        <span className="font-sans font-bold text-[5.5pt] uppercase px-1 py-0.2 border border-black/50 text-black shrink-0 leading-tight">
                          {eks.kelompok === "pelajaran" ? "PELAJARAN" : "BACAAN"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CetakStikerBukuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-ink" />
        </div>
      }
    >
      <CetakStikerBukuContent />
    </Suspense>
  );
}
