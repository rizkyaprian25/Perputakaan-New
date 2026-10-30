"use client";

import { useState, useEffect, useRef } from "react";
import { QrCode, CheckCircle2, AlertCircle, Clock, Send } from "lucide-react";

interface KunjunganItem {
  id: string;
  nama: string;
  kelas: string | null;
  jam: string;
}

export default function KioskPage() {
  const [jamDigital, setJamDigital] = useState<string>("");
  const [tanggalLengkap, setTanggalLengkap] = useState<string>("");
  const [nomorInduk, setNomorInduk] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Status Layar Sukses Penuh (2 detik warna hijau)
  const [suksesState, setSuksesState] = useState<{
    aktif: boolean;
    nama: string;
    kelas: string | null;
    jam: string;
  }>({
    aktif: false,
    nama: "",
    kelas: null,
    jam: "",
  });

  // Riwayat 5 Kedatangan Terakhir di Sisi Samping
  const [riwayat, setRiwayat] = useState<KunjunganItem[]>([
    { id: "1", nama: "Ahmad Fauzi", kelas: "VII-A", jam: "07:45" },
    { id: "2", nama: "Siti Rahmawati", kelas: "VII-A", jam: "07:50" },
    { id: "3", nama: "Budi Santoso, S.Pd.", kelas: "Guru", jam: "08:02" },
  ]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Update Jam Real-Time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setJamDigital(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setTanggalLengkap(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pastikan input selalu fokus untuk scanner USB keyboard wedge
  useEffect(() => {
    if (!suksesState.aktif) {
      inputRef.current?.focus();
    }
  }, [suksesState.aktif]);

  // Handler Submit Presensi (Scan QR atau Manual NIS/NIP)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nomorInduk.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Mock / Contract Action (Akan disambung ke API Route di Fase 3)
      let inputBersih = nomorInduk.trim();
      let namaTerdeteksi = "Siswa Terdaftar";
      let kelasTerdeteksi = "VII-B";

      // Jika format QR: PUS1:A:<token>
      if (inputBersih.startsWith("PUS1:A:")) {
        namaTerdeteksi = "Ahmad Fauzi (Kartu QR)";
        kelasTerdeteksi = "VII-A";
      } else if (inputBersih.length < 4) {
        throw new Error("Nomor induk minimal 4 karakter");
      }

      const waktuSekarang = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Tampilkan Layar Sukses Penuh selama 2 detik
      setSuksesState({
        aktif: true,
        nama: namaTerdeteksi,
        kelas: kelasTerdeteksi,
        jam: waktuSekarang,
      });

      // Tambahkan ke 5 kedatangan terakhir
      setRiwayat((prev) => [
        {
          id: String(Date.now()),
          nama: namaTerdeteksi,
          kelas: kelasTerdeteksi,
          jam: waktuSekarang,
        },
        ...prev.slice(0, 4),
      ]);

      setNomorInduk("");

      // Kembalikan ke mode normal setelah 2 detik (2000 ms)
      setTimeout(() => {
        setSuksesState({
          aktif: false,
          nama: "",
          kelas: null,
          jam: "",
        });
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mencatat kehadiran";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* ========================================================================= */}
      {/* 1. OVERLAY SUKSES HIJAU PENUH (2 DETIK)                                   */}
      {/* ========================================================================= */}
      {suksesState.aktif && (
        <div className="fixed inset-0 z-50 bg-status-tersedia text-white flex flex-col items-center justify-center p-8 animate-fade-in text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <span className="font-mono text-sm tracking-widest uppercase opacity-90 mb-2">
            Presensi Berhasil Dicatat
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-semibold tracking-tight mb-3">
            {suksesState.nama}
          </h1>
          <p className="font-sans text-xl opacity-90">
            {suksesState.kelas && `Kelas: ${suksesState.kelas} • `}Pukul {suksesState.jam} WIB
          </p>
          <p className="font-serif italic text-white/80 text-lg mt-8">
            Selamat datang & selamat membaca.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAMPILAN UTAMA KIOSK                                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Kolom Kiri & Tengah: Viewfinder QR & Input Manual */}
        <div className="lg:col-span-2 space-y-6">
          {/* Jam Digital Kiosk */}
          <div className="bg-surface border border-line rounded-lg p-6 text-center shadow-sm">
            <div className="font-mono text-4xl sm:text-6xl font-bold tracking-tight text-ink tabular-nums">
              {jamDigital || "--:--:--"}
            </div>
            <p className="font-sans text-sm text-ink-muted mt-1">{tanggalLengkap}</p>
          </div>

          {/* Viewfinder Pemindai QR & Scanner USB */}
          <div className="bg-surface border border-line rounded-lg p-6 sm:p-10 text-center shadow-sm flex flex-col items-center">
            {/* Bingkai Pemindai (Viewfinder) */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-dashed border-ink/40 rounded-xl flex flex-col items-center justify-center p-6 bg-paper/50 overflow-hidden mb-6">
              <QrCode className="w-24 h-24 text-ink-muted/60 stroke-1" />
              <span className="font-mono text-xs text-ink-muted mt-3">Arahkan Kartu ke Kamera</span>

              {/* Garis Pemindai Animasi */}
              <div
                className="absolute left-0 right-0 h-0.5 bg-group-hiburan/80 shadow-[0_0_8px_rgba(184,56,26,0.8)] animate-pulse top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
            </div>

            {/* Form Input NIS / NIP Manual */}
            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3">
              <label
                htmlFor="nomorIndukInput"
                className="block text-xs font-medium text-ink-muted text-left"
              >
                Scan Kartu QR atau Ketik NIS / NIP:
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  id="nomorIndukInput"
                  type="text"
                  value={nomorInduk}
                  onChange={(e) => setNomorInduk(e.target.value)}
                  placeholder="Contoh: 202407001 atau PUS1:A:..."
                  className="flex-1 px-4 py-3 rounded-md border border-line bg-white font-mono text-base focus:border-ink focus:ring-0 min-h-[44px]"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !nomorInduk.trim()}
                  className="px-5 py-3 rounded-md bg-ink text-paper font-medium text-sm inline-flex items-center gap-1.5 hover:bg-ink/90 disabled:opacity-50 transition-colors min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                  <span>Catat</span>
                </button>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded bg-danger/10 text-danger text-xs text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Kolom Kanan: 5 Kedatangan Terakhir */}
        <div className="bg-surface border border-line rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-serif font-semibold text-lg text-ink">Kehadiran Terakhir</h3>
            <span className="font-mono text-xs text-ink-muted">Hari Ini</span>
          </div>

          <div className="divide-y divide-line/60">
            {riwayat.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-sans font-medium text-sm text-ink">{item.nama}</h4>
                  <p className="font-mono text-xs text-ink-muted">{item.kelas || "Umum"}</p>
                </div>
                <div className="inline-flex items-center gap-1 font-mono text-xs text-status-tersedia font-semibold shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.jam}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
