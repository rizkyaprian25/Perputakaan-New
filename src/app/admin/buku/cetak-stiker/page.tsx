"use client";

/**
 * Bilik Baca - Halaman Mandiri Cetak Stiker QR Punggung Buku
 * Dirancang khusus agar bebas 100% dari navbar, sidebar, atau elemen web lainnya.
 * Menghasilkan lembar cetak presisi standar perpustakaan (65mm x 35mm).
 */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, AlertCircle, Loader2, Sparkles, Check } from "lucide-react";

function CetakStikerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const bukuId = searchParams.get("bukuId");
  const eksemplarIdsParam = searchParams.get("ids");
  const autoPrint = searchParams.get("autoprint") === "true";

  const [buku, setBuku] = useState<any | null>(null);
  const [daftarEksemplar, setDaftarEksemplar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jumlahKolom, setJumlahKolom] = useState<"3" | "2">("3");

  useEffect(() => {
    if (!bukuId) {
      setError("Parameter ID buku tidak ditemukan.");
      setLoading(false);
      return;
    }

    const muatData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/admin/buku/${bukuId}`);
        const json = await res.json();

        if (!res.ok || !json.sukses) {
          throw new Error(json.pesan || "Gagal memuat data buku");
        }

        setBuku(json.data.buku);
        let eks = json.data.eksemplar || [];

        // Jika ada filter ID eksemplar tertentu
        if (eksemplarIdsParam) {
          const idList = eksemplarIdsParam.split(",");
          eks = eks.filter((item: any) => idList.includes(item.id));
        }

        setDaftarEksemplar(eks);
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat memuat data");
      } finally {
        setLoading(false);
      }
    };

    muatData();
  }, [bukuId, eksemplarIdsParam]);

  // Otomatis buka dialog print browser jika diminta dan data sudah siap
  useEffect(() => {
    if (autoPrint && !loading && buku && daftarEksemplar.length > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, loading, buku, daftarEksemplar]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
        <p className="font-sans text-sm text-ink-muted">
          Menyiapkan lembar stiker QR barcode buku...
        </p>
      </div>
    );
  }

  if (error || !buku) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-bold text-xl text-ink">Gagal Menyiapkan Stiker</h2>
        <p className="font-sans text-sm text-ink-muted max-w-md">{error}</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-sunken/40 print:bg-white p-4 sm:p-8 print:p-0">
      {/* Toolbar Atas (Otomatis Hilang Saat Dicetak) */}
      <div className="max-w-4xl mx-auto mb-6 bg-surface border border-line rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg border border-line bg-paper hover:bg-paper-sunken text-ink transition-colors"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-serif font-bold text-base text-ink">
              Pratinjau Cetak Stiker QR Punggung Buku
            </h1>
            <p className="font-sans text-xs text-ink-muted">
              {buku.judul} • Total {daftarEksemplar.length} Unit Eksemplar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-sans text-ink-muted bg-paper px-2.5 py-1.5 rounded-lg border border-line">
            <span>Kolom Kertas:</span>
            <button
              onClick={() => setJumlahKolom("3")}
              className={`px-2 py-0.5 rounded font-semibold ${
                jumlahKolom === "3" ? "bg-ink text-paper" : "text-ink hover:bg-paper-sunken"
              }`}
            >
              3 (A4)
            </button>
            <button
              onClick={() => setJumlahKolom("2")}
              className={`px-2 py-0.5 rounded font-semibold ${
                jumlahKolom === "2" ? "bg-ink text-paper" : "text-ink hover:bg-paper-sunken"
              }`}
            >
              2
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Lembar Stiker</span>
          </button>
        </div>
      </div>

      {/* Area Lembar Stiker Fisik Murni (Satu-satunya yang Masuk ke Kertas/PDF) */}
      <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
        <div
          className={`grid gap-3 p-4 bg-white rounded-2xl border border-line shadow-sm print:shadow-none print:border-none print:p-0 print:gap-2.5 ${
            jumlahKolom === "3" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 print:grid-cols-2"
          }`}
        >
          {daftarEksemplar.map((eks) => (
            <div
              key={eks.id}
              className="border-2 border-dashed border-ink/40 rounded-xl p-2.5 bg-white flex items-center gap-2.5 print:border print:border-dashed print:border-black print:rounded-none print:p-2 break-inside-avoid shadow-xs print:shadow-none"
              style={{ minHeight: "35mm" }}
            >
              {/* Gambar Kode QR Beresolusi Tinggi */}
              <div className="p-1 bg-white border border-black rounded shrink-0 print:p-0.5">
                <img
                  src={`/api/v1/admin/qr?tipe=buku&id=${eks.id}`}
                  alt={eks.kode}
                  className="w-18 h-18 object-contain shrink-0 print:w-[20mm] print:h-[20mm]"
                />
              </div>

              {/* Data Stiker Punggung Buku */}
              <div className="min-w-0 flex-1 space-y-1">
                <span className="font-sans text-[8px] uppercase tracking-wider bg-black text-white px-1.5 py-0.5 rounded block w-fit font-bold print:text-[7px]">
                  BILIK BACA • {buku.lokasiRak || "RAK"}
                </span>
                <p className="font-mono font-bold text-xs text-black tracking-tight print:text-[11px]">
                  {eks.kode}
                </p>
                <p className="font-serif font-bold text-xs text-black line-clamp-2 leading-tight print:text-[10px]">
                  {buku.judul}
                </p>
                <p className="font-sans text-[10px] text-gray-700 truncate print:text-[8px]">
                  {buku.penulis}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
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
      <CetakStikerContent />
    </Suspense>
  );
}
