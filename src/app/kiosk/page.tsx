"use client";

import { useState, useEffect, useRef } from "react";
import { QrCode, CheckCircle2, AlertCircle, Clock, Send, UserCheck, Sparkles, Camera, CameraOff } from "lucide-react";
import { QrCameraScanner } from "@/components/ui/QrCameraScanner";

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

  // Riwayat 5 Kedatangan Terakhir di Monitor PC Kiosk
  const [riwayat, setRiwayat] = useState<KunjunganItem[]>([]);
  const [kameraAktif, setKameraAktif] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Micro-Interaksi: Efek Suara Chime Lembut (Web Audio API murni tanpa file eksternal)
  const mainkanNadaUmpanBalik = (jenis: "sukses" | "galat") => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (jenis === "sukses") {
        // Nada ganda naik harmonis (C5 -> E5)
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        // Nada peringatan lembut rendah
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Abaikan jika browser memblokir autoplay audio
    }
  };

  // Ambil data live feed kunjungan hari ini dari server
  const muatFeedTerakhir = async () => {
    try {
      const res = await fetch("/api/v1/absensi/terakhir");
      const json = await res.json();
      if (json.sukses && Array.isArray(json.data)) {
        setRiwayat(json.data);
      }
    } catch (e) {
      console.error("Gagal memuat feed kehadiran:", e);
    }
  };

  useEffect(() => {
    muatFeedTerakhir();
  }, []);

  // Update Jam Real-Time WIB
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

  // Autofocus input untuk Scanner Barcode / QR USB (Keyboard Wedge)
  useEffect(() => {
    if (!suksesState.aktif) {
      inputRef.current?.focus();
    }
  }, [suksesState.aktif]);

  // Handler Catat Presensi Siswa (Dapat dipanggil dari Scanner Barcode USB atau Kamera)
  const prosesCatatPresensi = async (inputStr: string) => {
    if (!inputStr.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/absensi/catat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: inputStr.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Kartu tidak dikenali atau belum terdaftar");
      }

      const hasil = json.data;
      mainkanNadaUmpanBalik("sukses");

      // Tampilkan Layar Sukses Penuh selama 2 detik
      setSuksesState({
        aktif: true,
        nama: hasil.nama,
        kelas: hasil.kelas,
        jam: hasil.jam,
      });

      // Muat ulang live feed kehadiran
      await muatFeedTerakhir();
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
      mainkanNadaUmpanBalik("galat");
      const msg = err instanceof Error ? err.message : "Gagal mencatat presensi siswa";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await prosesCatatPresensi(nomorInduk);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-center">
      {/* ========================================================================= */}
      {/* 1. OVERLAY SUKSES HIJAU PENUH MONITOR KOMPUTER (2 DETIK)                 */}
      {/* ========================================================================= */}
      {suksesState.aktif && (
        <div className="fixed inset-0 z-50 bg-status-tersedia text-white flex flex-col items-center justify-center p-12 text-center animate-fade-in shadow-2xl">
          <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-8 shadow-inner">
            <CheckCircle2 className="w-16 h-16 text-white stroke-[2.5]" />
          </div>
          <span className="font-mono text-base tracking-widest uppercase opacity-90 mb-3 bg-white/15 px-4 py-1.5 rounded-full">
            Kehadiran Berhasil Dicatat
          </span>
          <h1 className="font-serif text-6xl md:text-7xl font-bold tracking-tight mb-4">
            {suksesState.nama}
          </h1>
          <p className="font-sans text-2xl opacity-90">
            {suksesState.kelas && `Kelas: ${suksesState.kelas} • `}Pukul {suksesState.jam} WIB
          </p>
          <div className="flex items-center gap-2 mt-10 text-white/90 font-serif italic text-2xl">
            <Sparkles className="w-6 h-6" />
            <span>Selamat datang di Perpustakaan NETRI. Selamat belajar & membaca!</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAMPILAN MONITOR DESKTOP KIOSK (2 KOLOM LANDSCAPE)                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-12 gap-8 items-stretch">
        {/* Kolom Kiri (7 Kolom): Jam Raksasa & Viewfinder Scanner */}
        <div className="col-span-7 flex flex-col justify-between gap-6 bg-surface border border-line rounded-2xl p-8 shadow-sm">
          {/* Jam Digital Kiosk */}
          <div className="flex items-center justify-between pb-6 border-b border-line">
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-ink-muted block">
                Waktu Indonesia Barat
              </span>
              <div className="font-mono text-6xl font-extrabold tracking-tight text-ink tabular-nums">
                {jamDigital || "--:--:--"}
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs text-status-tersedia font-semibold uppercase block">
                Presensi Pengunjung
              </span>
              <p className="font-serif text-lg text-ink font-semibold mt-1">{tanggalLengkap}</p>
            </div>
          </div>

          {/* Bingkai Pemindai Kartu QR (Viewfinder / Kamera Webcam Live) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-muted font-semibold">
                Pemindai Kartu Anggota:
              </span>
              <button
                type="button"
                onClick={() => setKameraAktif(!kameraAktif)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  kameraAktif
                    ? "bg-danger text-white hover:bg-danger/90"
                    : "bg-ink text-paper hover:bg-ink/90"
                }`}
              >
                {kameraAktif ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Matikan Kamera</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Buka Kamera Webcam</span>
                  </>
                )}
              </button>
            </div>

            {kameraAktif ? (
              <QrCameraScanner
                label="Dekatkan Kartu QR Siswa ke Lensa Kamera"
                autoStopOnScan={false}
                onScan={(hasil) => prosesCatatPresensi(hasil)}
                onClose={() => setKameraAktif(false)}
              />
            ) : (
              <div className="relative border-2 border-dashed border-ink/30 rounded-xl p-8 bg-paper/60 flex flex-col items-center justify-center text-center overflow-hidden min-h-[220px]">
                <div className="w-16 h-16 rounded-2xl bg-surface border border-line flex items-center justify-center mb-3 scanner-pulse-ring">
                  <QrCode className="w-9 h-9 text-group-pelajaran stroke-[1.75]" />
                </div>
                <span className="font-serif font-semibold text-lg text-ink">
                  Arahkan Kartu Anggota Perpustakaan NETRI ke Pemindai USB
                </span>
                <span className="font-mono text-xs text-ink-muted mt-1">
                  atau klik tombol &ldquo;Buka Kamera Webcam&rdquo; di atas • Nada Konfirmasi Aktif
                </span>

                {/* Garis Laser Animasi Pemindai */}
                <div
                  className="absolute left-6 right-6 h-0.5 bg-group-hiburan shadow-[0_0_12px_rgba(184,56,26,1)] animate-pulse top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>

          {/* Form Input Manual NIS / NIP (Mendukung Scanner USB Keyboard Wedge) */}
          <form onSubmit={handleSubmit} className="space-y-2 pt-2">
            <label
              htmlFor="nomorIndukInput"
              className="block text-xs font-semibold uppercase tracking-wider text-ink-muted"
            >
              Ketik NIS / NIP Siswa Manual (Bila Tidak Membawa Kartu):
            </label>
            <div className="flex gap-3">
              <input
                ref={inputRef}
                id="nomorIndukInput"
                type="text"
                value={nomorInduk}
                onChange={(e) => setNomorInduk(e.target.value)}
                placeholder="Masukkan Nomor Induk Siswa lalu tekan Enter..."
                className="flex-1 px-5 py-3.5 rounded-lg border border-line bg-white font-mono text-lg focus:border-ink focus:ring-1 focus:ring-ink min-h-[48px]"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting || !nomorInduk.trim()}
                className="px-6 py-3.5 rounded-lg bg-ink text-paper font-semibold text-sm inline-flex items-center gap-2 hover:bg-ink/90 disabled:opacity-50 transition-colors min-h-[48px] shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Catat Presensi</span>
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 text-danger text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </form>
        </div>

        {/* Kolom Kanan (5 Kolom): Live Feed Riwayat Kedatangan Hari Ini */}
        <div className="col-span-5 flex flex-col justify-between bg-surface border border-line rounded-2xl p-8 shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-status-tersedia" />
                <h3 className="font-serif font-semibold text-xl text-ink">Presensi Terakhir</h3>
              </div>
              <span className="font-mono text-xs text-ink-muted bg-paper-sunken px-2.5 py-1 rounded">
                Live Feed
              </span>
            </div>

            <div className="divide-y divide-line/60">
              {riwayat.map((item, idx) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-paper-sunken flex items-center justify-center font-mono font-bold text-xs text-ink">
                      {item.nama.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-sans font-semibold text-sm text-ink leading-tight">
                        {item.nama}
                      </h4>
                      <p className="font-mono text-xs text-ink-muted mt-0.5">{item.kelas || "Siswa"}</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 font-mono text-xs text-status-tersedia font-semibold shrink-0 bg-status-tersedia/10 px-2.5 py-1 rounded">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.jam} WIB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-line text-center text-xs text-ink-muted font-mono">
            Petugas piket: Siaga di meja sirkulasi
          </div>
        </div>
      </div>
    </div>
  );
}
