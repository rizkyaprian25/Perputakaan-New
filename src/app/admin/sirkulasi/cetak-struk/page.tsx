"use client";

/**
 * Bilik Baca - Halaman Mandiri Cetak Struk Peminjaman Buku Perpustakaan
 * Bebas 100% dari background web, siap dicetak pada printer thermal 80mm / kertas A4.
 */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";

function CetakStrukContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [struk, setStruk] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // Ambil data struk dari sessionStorage yang disimpan saat transaksi berhasil
      const dataRaw = sessionStorage.getItem("bilikbaca_last_struk");
      if (dataRaw) {
        setStruk(JSON.parse(dataRaw));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }

  if (!struk) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-bold text-xl text-ink">Data Struk Tidak Ditemukan</h2>
        <p className="font-sans text-sm text-ink-muted max-w-md">
          Sesi bukti peminjaman telah kedaluwarsa atau belum ada transaksi peminjaman baru yang diproses.
        </p>
        <button
          onClick={() => router.push("/admin/sirkulasi")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Meja Sirkulasi</span>
        </button>
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
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-serif font-bold text-sm text-ink">Pratinjau Slip Pinjam</h1>
            <p className="font-sans text-xs text-ink-muted">Format Standar 80mm</p>
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

      {/* Slip Fisik Murni */}
      <div className="flex justify-center print:block print:m-0 print:p-0">
        <div className="w-full max-w-sm p-6 rounded-xl border-2 border-dashed border-ink/40 bg-white space-y-4 font-mono text-xs print:border print:border-black print:rounded-none print:p-4 print:max-w-[80mm] print:text-[10px] break-inside-avoid shadow-sm print:shadow-none">
          {/* Header Struk Resmi */}
          <div className="text-center border-b border-black pb-2 space-y-0.5">
            <div className="font-serif font-bold text-sm text-black tracking-tight uppercase">
              Perpustakaan Bilik Baca
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
            {struk.daftarBuku.map((b: any, i: number) => (
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
              <div className="h-12" />
              <p className="font-bold truncate">({struk.namaPeminjam})</p>
            </div>
            <div>
              <p className="text-gray-600 font-sans">Petugas Perpustakaan,</p>
              <div className="h-12" />
              <p className="font-bold">( Staf Sirkulasi )</p>
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
        <div className="min-h-screen bg-white flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-ink" />
        </div>
      }
    >
      <CetakStrukContent />
    </Suspense>
  );
}
