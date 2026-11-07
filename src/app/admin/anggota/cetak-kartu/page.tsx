"use client";

/**
 * Bilik Baca - Halaman Mandiri Cetak Kartu Anggota Siswa (ID-1 & Lembar Massal A4)
 * Menjamin 100% bebas dari navbar, sidebar, header web, dan tabel background.
 */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, AlertCircle, Loader2, Sparkles } from "lucide-react";

function CetakKartuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const anggotaId = searchParams.get("id");
  const kelasParam = searchParams.get("kelas");
  const autoPrint = searchParams.get("autoprint") === "true";

  const [daftarAnggota, setDaftarAnggota] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const muatData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/admin/anggota");
        const json = await res.json();

        if (!res.ok || !json.sukses) {
          throw new Error(json.pesan || "Gagal memuat data anggota");
        }

        let anggotaList = json.data || [];

        if (anggotaId) {
          anggotaList = anggotaList.filter((a: any) => a.id === anggotaId);
          if (anggotaList.length === 0) {
            throw new Error("Data siswa dengan ID tersebut tidak ditemukan.");
          }
        } else if (kelasParam && kelasParam !== "semua") {
          anggotaList = anggotaList.filter((a: any) => (a.kelas || "").trim() === kelasParam.trim());
        }

        setDaftarAnggota(anggotaList);
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat memuat data anggota");
      } finally {
        setLoading(false);
      }
    };

    muatData();
  }, [anggotaId, kelasParam]);

  useEffect(() => {
    if (autoPrint && !loading && daftarAnggota.length > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, loading, daftarAnggota]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
        <p className="font-sans text-sm text-ink-muted">
          Menyiapkan lembar kartu anggota perpustakaan...
        </p>
      </div>
    );
  }

  if (error || daftarAnggota.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-bold text-xl text-ink">Gagal Menyiapkan Kartu</h2>
        <p className="font-sans text-sm text-ink-muted max-w-md">{error || "Tidak ada anggota yang ditemukan."}</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Master Anggota</span>
        </button>
      </div>
    );
  }

  const isTunggal = daftarAnggota.length === 1;

  return (
    <div className="min-h-screen bg-paper-sunken/40 print:bg-white p-4 sm:p-8 print:p-0">
      {/* Toolbar Atas - Tersembunyi saat Cetak */}
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
              {isTunggal ? "Pratinjau Cetak Kartu Anggota" : "Pratinjau Lembar Kartu Anggota Massal"}
            </h1>
            <p className="font-sans text-xs text-ink-muted">
              {isTunggal
                ? `${daftarAnggota[0].nama} (NIS: ${daftarAnggota[0].nomorInduk}) • Format Standar ID-1`
                : `Total ${daftarAnggota.length} Siswa • Kisi 8 Kartu per Lembar A4`}
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Dokumen Sekarang</span>
        </button>
      </div>

      {/* Lembar Cetak Bersih */}
      <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
        {isTunggal ? (
          /* Cetak Tunggal: Format ID-1 (85.6mm x 54mm) */
          <div className="flex justify-center print:block print:m-0 print:p-0">
            <div className="w-[340px] border-2 border-dashed border-ink/40 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between print:w-[85.6mm] print:h-[54mm] print:border print:border-dashed print:border-black print:rounded-none print:p-3 print:shadow-none break-inside-avoid">
              {/* Header Kartu Resmi */}
              <div className="flex items-center justify-between border-b border-black/80 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-black text-white flex items-center justify-center font-serif font-bold text-xs print:w-5 print:h-5 print:text-[10px]">
                    B
                  </div>
                  <div>
                    <span className="font-serif font-bold text-xs uppercase tracking-tight block text-black leading-none">
                      Bilik Baca
                    </span>
                    <span className="font-sans text-[8px] uppercase tracking-wider text-gray-700 block mt-0.5">
                      Perpustakaan Sekolah
                    </span>
                  </div>
                </div>
                <span className="font-sans text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border border-black text-black">
                  KARTU ANGGOTA
                </span>
              </div>

              {/* Badan Kartu: QR Code + Data Siswa */}
              <div className="flex items-center gap-3 py-2">
                <div className="p-1 bg-white border border-black rounded shrink-0 print:p-0.5">
                  <img
                    src={`/api/v1/admin/qr?tipe=anggota&id=${daftarAnggota[0].id}`}
                    alt={`QR ${daftarAnggota[0].nama}`}
                    className="w-20 h-20 object-contain print:w-[22mm] print:h-[22mm]"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="font-serif font-bold text-sm text-black truncate leading-tight print:text-xs">
                    {daftarAnggota[0].nama}
                  </h4>
                  <p className="font-mono text-xs text-black font-semibold print:text-[10px]">
                    NIS: {daftarAnggota[0].nomorInduk}
                  </p>
                  <p className="font-sans text-xs text-gray-800 print:text-[10px]">
                    Kelas: {daftarAnggota[0].kelas || "Umum"}
                  </p>
                  <p className="font-sans text-[9px] text-gray-600 print:text-[8px] capitalize">
                    Kategori: {daftarAnggota[0].jenis} • Aktif
                  </p>
                </div>
              </div>

              {/* Footer Kartu & Garis Potong */}
              <div className="border-t border-black/60 pt-1.5 flex items-center justify-between text-[8px] font-sans text-gray-700 print:text-[7px]">
                <span>Pindai QR saat presensi & peminjaman</span>
                <span className="font-semibold text-black">Tahun Ajaran 2026/2027</span>
              </div>
            </div>
          </div>
        ) : (
          /* Cetak Massal A4: Kisi 2 Kolom x 4 Baris Siap Gunting */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[800px] mx-auto print:max-w-none print:grid-cols-2 print:gap-3 print:p-0">
            {daftarAnggota.map((m) => (
              <div
                key={m.id}
                className="border-2 border-dashed border-ink/40 rounded-xl p-3 bg-white flex flex-col justify-between print:border print:border-dashed print:border-black print:rounded-none print:p-2.5 break-inside-avoid shadow-xs print:shadow-none"
              >
                {/* Header Kartu Mini */}
                <div className="flex items-center justify-between border-b border-black/70 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-black text-white flex items-center justify-center font-serif font-bold text-[9px] print:w-4 print:h-4 print:text-[8px]">
                      B
                    </div>
                    <span className="font-serif font-bold text-xs uppercase text-black leading-none print:text-[10px]">
                      Bilik Baca Perpustakaan
                    </span>
                  </div>
                  <span className="font-sans text-[8px] uppercase font-bold px-1 rounded border border-black text-black">
                    SISWA
                  </span>
                </div>

                {/* Isi Kartu */}
                <div className="flex items-center gap-3 py-2">
                  <div className="p-0.5 bg-white border border-black rounded shrink-0">
                    <img
                      src={`/api/v1/admin/qr?tipe=anggota&id=${m.id}`}
                      alt={`QR ${m.nama}`}
                      className="w-18 h-18 object-contain print:w-[19mm] print:h-[19mm]"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className="font-serif font-bold text-xs text-black truncate leading-tight print:text-[11px]">
                      {m.nama}
                    </h4>
                    <p className="font-mono text-xs text-black font-semibold print:text-[10px]">
                      NIS: {m.nomorInduk}
                    </p>
                    <p className="font-sans text-[11px] text-gray-800 print:text-[9px]">
                      Kelas: {m.kelas || "Umum"}
                    </p>
                  </div>
                </div>

                {/* Footer Garis Gunting */}
                <div className="border-t border-black/50 pt-1 flex items-center justify-between text-[8px] font-sans text-gray-600 print:text-[7px]">
                  <span>Gunting mengikuti garis putus-putus</span>
                  <span>TA 2026/2027</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CetakKartuAnggotaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-ink" />
        </div>
      }
    >
      <CetakKartuContent />
    </Suspense>
  );
}
