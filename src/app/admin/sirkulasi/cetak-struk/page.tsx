"use client";

/**
 * Perpustakaan NETRI - Halaman Mandiri Cetak Struk Peminjaman Buku Perpustakaan
 * Bebas 100% dari background web, siap dicetak pada printer thermal 80mm / kertas A4.
 * Mendukung pembacaan via URL query parameters (id, batchId, kode) atau fallback sessionStorage.
 */

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, AlertCircle, Loader2, RefreshCw } from "lucide-react";

interface StrukItemBuku {
  kode: string;
  judul: string;
  lokasiRak?: string;
}

interface StrukData {
  peminjamanId?: string;
  batchId?: string;
  namaPeminjam: string;
  nomorInduk: string;
  kelas: string | null;
  jumlahBuku: number;
  dipinjamPada: string;
  jatuhTempo: string;
  daftarBuku: StrukItemBuku[];
  namaPetugas?: string;
  isAktif?: boolean;
}

function CetakStrukContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [struk, setStruk] = useState<StrukData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);

  const muatDataStruk = useCallback(async () => {
    setLoading(true);
    setErrorPesan(null);

    const id = searchParams.get("id")?.trim() || "";
    const batchId = searchParams.get("batchId")?.trim() || "";
    const kode = searchParams.get("kode")?.trim() || searchParams.get("eksemplarKode")?.trim() || "";
    const autoprint = searchParams.get("autoprint");

    const bersihkan = (str: string) =>
      String(str || "")
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 45);

    try {
      // 1. Jika ada parameter pencarian spesifik (id, batchId, atau kode), ambil dari API
      if (id || batchId || kode) {
        const queryParams = new URLSearchParams();
        if (id) queryParams.set("id", id);
        if (batchId) queryParams.set("batchId", batchId);
        if (kode) queryParams.set("eksemplarKode", kode);

        const res = await fetch(`/api/v1/admin/sirkulasi/struk?${queryParams.toString()}`);
        const json = await res.json();

        if (res.ok && json.sukses && json.data) {
          setStruk(json.data);
          const tgl = new Date().toISOString().slice(0, 10);
          document.title = `Struk_Pinjam_${bersihkan(json.data.namaPeminjam)}_${bersihkan(json.data.kelas || "Umum")}_${tgl}`;

          if (autoprint === "true" || autoprint === "1") {
            setTimeout(() => {
              window.print();
            }, 600);
          }
          return;
        }
      }

      // 2. Fallback: Ambil dari sessionStorage jika tidak ada param atau API gagal
      const dataRaw = sessionStorage.getItem("bilikbaca_last_struk");
      if (dataRaw) {
        const parsed: StrukData = JSON.parse(dataRaw);
        setStruk(parsed);
        const tgl = new Date().toISOString().slice(0, 10);
        document.title = `Struk_Pinjam_${bersihkan(parsed.namaPeminjam || "Siswa")}_${bersihkan(parsed.kelas || "Umum")}_${tgl}`;

        if (autoprint === "true" || autoprint === "1") {
          setTimeout(() => {
            window.print();
          }, 600);
        }
        return;
      }

      // Jika data tidak ditemukan baik di API maupun sessionStorage
      setErrorPesan("Data transaksi peminjaman tidak ditemukan atau sesi telah berakhir.");
    } catch (e: any) {
      console.error("Gagal memuat struk peminjaman:", e);
      setErrorPesan("Terjadi kendala jaringan saat memuat data struk peminjaman.");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    muatDataStruk();
  }, [muatDataStruk]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
        <p className="font-sans text-xs text-ink-muted">Memuat data struk peminjaman...</p>
      </div>
    );
  }

  if (errorPesan || !struk) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-bold text-xl text-ink">Data Struk Tidak Ditemukan</h2>
        <p className="font-sans text-sm text-ink-muted max-w-md">
          {errorPesan || "Sesi bukti peminjaman telah kedaluwarsa atau belum ada transaksi yang dipilih."}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => muatDataStruk()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-line bg-surface text-ink text-xs font-semibold hover:bg-paper-sunken transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>
          <button
            onClick={() => router.push("/admin/sirkulasi")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Meja Sirkulasi</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-sunken/40 print:bg-white p-4 sm:p-8 print:p-0">
      {/* Toolbar Atas - Tersembunyi saat Cetak */}
      <div className="max-w-md mx-auto mb-6 bg-surface border border-line rounded-xl p-4 shadow-sm flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/sirkulasi")}
            className="p-2 rounded-lg border border-line bg-paper hover:bg-paper-sunken text-ink transition-colors"
            title="Kembali ke Sirkulasi"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-serif font-bold text-sm text-ink">Pratinjau Slip Pinjam</h1>
            <p className="font-sans text-xs text-ink-muted">Format Standar 80mm Thermal / A4</p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Slip</span>
        </button>
      </div>

      {/* Slip Fisik Murni - Kompatibel Printer Kasir Thermal 80mm & Kertas A4 */}
      <div className="flex justify-center print:block print:m-0 print:p-0">
        <div className="w-full max-w-sm p-6 rounded-xl border-2 border-dashed border-ink/40 bg-white space-y-4 font-mono text-xs print:border print:border-black print:rounded-none print:p-4 print:max-w-[80mm] print:text-[10px] break-inside-avoid shadow-sm print:shadow-none">
          {/* Header Struk Resmi */}
          <div className="text-center border-b border-black pb-2 space-y-0.5">
            <div className="font-serif font-bold text-sm text-black tracking-tight uppercase">
              Perpustakaan NETRI
            </div>
            <div className="font-sans text-[10px] text-gray-700 font-medium">
              SLIP BUKTI PEMINJAMAN KOLEKSI
            </div>
            <div className="text-[9px] text-gray-600 font-mono">
              Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} • {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
            </div>
          </div>

          {/* Data Peminjam */}
          <div className="space-y-1 text-black border-b border-black/40 pb-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Peminjam:</span>
              <span className="font-bold truncate max-w-[180px]">{struk.namaPeminjam}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">NIS / Kelas:</span>
              <span className="font-semibold">
                {struk.nomorInduk} / {struk.kelas || "Umum"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tgl Pinjam:</span>
              <span>{struk.dipinjamPada}</span>
            </div>
            <div className="flex justify-between font-bold text-black border-t border-black/20 pt-1">
              <span>Jatuh Tempo:</span>
              <span className="border-b border-black pb-0.5">{struk.jatuhTempo}</span>
            </div>
          </div>

          {/* Daftar Buku yang Dipinjam */}
          <div className="space-y-1.5 border-b border-black/40 pb-2">
            <div className="font-sans text-[10px] uppercase font-bold text-gray-800">
              Buku Dipinjam ({struk.jumlahBuku} Unit):
            </div>
            {struk.daftarBuku.map((b: StrukItemBuku, i: number) => (
              <div key={i} className="flex justify-between items-start gap-2 text-[10px]">
                <span className="font-bold font-mono shrink-0">{b.kode}</span>
                <span className="text-right truncate flex-1 font-sans">{b.judul}</span>
              </div>
            ))}
          </div>

          {/* Catatan Peraturan Perpustakaan */}
          <div className="font-sans text-[9px] text-center text-gray-700 leading-tight">
            Masa pinjam 7 hari. Keterlambatan dikenakan denda sesuai tata tertib perpustakaan sekolah.
          </div>

          {/* Kolom Tanda Tangan */}
          <div className="grid grid-cols-2 gap-4 pt-3 text-[9px] text-center text-black">
            <div>
              <p className="text-gray-600 font-sans">Peminjam,</p>
              <div className="h-10 print:h-8" />
              <p className="font-bold border-t border-black/60 pt-0.5 truncate">
                ({struk.namaPeminjam})
              </p>
            </div>
            <div>
              <p className="text-gray-600 font-sans">Petugas Jaga,</p>
              <div className="h-10 print:h-8" />
              <p className="font-bold border-t border-black/60 pt-0.5 truncate">
                {struk.namaPetugas || "Perpustakaan NETRI"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CetakStrukPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-ink" />
          <p className="font-sans text-xs text-ink-muted">Memuat halaman slip...</p>
        </div>
      }
    >
      <CetakStrukContent />
    </Suspense>
  );
}
