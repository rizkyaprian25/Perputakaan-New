"use client";

/**
 * Perpustakaan NETRI - Komponen Pemindai Kamera Webcam Live (QR & Barcode)
 * Memanfaatkan BarcodeDetector API bawaan browser modern dan stream video HTML5.
 * Dilengkapi feedback audio Web Audio API otomatis saat kode berhasil dibaca.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, CameraOff, X, AlertCircle, RefreshCw } from "lucide-react";

interface QrCameraScannerProps {
  onScan: (hasil: string) => void;
  onClose?: () => void;
  label?: string;
  autoStopOnScan?: boolean;
}

export function QrCameraScanner({
  onScan,
  onClose,
  label = "Arahkan Kartu QR atau Barcode ke Kamera",
  autoStopOnScan = true,
}: QrCameraScannerProps) {
  const [aktif, setAktif] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detectorTersedia, setDetectorTersedia] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const timerScanRef = useRef<any>(null);
  const terakhirScannedRef = useRef<{ kode: string; waktu: number }>({ kode: "", waktu: 0 });

  // Fungsi membunyikan beep singkat via Web Audio API saat scan berhasil
  const bunyikanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Nada A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Abaikan jika audio tidak didukung
    }
  };

  // Hentikan stream kamera
  const hentikanKamera = useCallback(() => {
    if (timerScanRef.current) {
      clearInterval(timerScanRef.current);
      timerScanRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setAktif(false);
  }, []);

  // Mulai stream kamera
  const mulaiKamera = useCallback(async () => {
    setErrorMsg(null);

    // Cek ketersediaan BarcodeDetector API
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        detectorRef.current = new (window as any).BarcodeDetector({
          formats: ["qr_code", "code_128", "code_39", "ean_13"],
        });
      } catch {
        detectorRef.current = null;
      }
    } else {
      setDetectorTersedia(false);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setAktif(true);

      // Loop deteksi frame video setiap 200 ms
      timerScanRef.current = setInterval(async () => {
        if (!videoRef.current || !detectorRef.current || videoRef.current.readyState < 2) {
          return;
        }

        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue?.trim();
            if (rawValue) {
              const now = Date.now();
              // Debounce 2 detik untuk kode yang sama
              if (
                terakhirScannedRef.current.kode === rawValue &&
                now - terakhirScannedRef.current.waktu < 2000
              ) {
                return;
              }

              terakhirScannedRef.current = { kode: rawValue, waktu: now };
              bunyikanBeep();
              onScan(rawValue);

              if (autoStopOnScan) {
                hentikanKamera();
                if (onClose) onClose();
              }
            }
          }
        } catch {
          // Abaikan kesalahan pembacaan frame sesaat
        }
      }, 200);
    } catch (err: any) {
      console.error("Gagal menyalakan webcam:", err);
      setErrorMsg(
        err.name === "NotAllowedError"
          ? "Izin akses kamera ditolak oleh browser. Mohon izinkan akses kamera di bilah alamat browser."
          : "Perangkat kamera webcam tidak ditemukan atau sedang digunakan aplikasi lain."
      );
      hentikanKamera();
    }
  }, [onScan, autoStopOnScan, hentikanKamera, onClose]);

  useEffect(() => {
    mulaiKamera();
    return () => {
      hentikanKamera();
    };
  }, [mulaiKamera, hentikanKamera]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-line flex flex-col items-center justify-center min-h-[300px] w-full shadow-lg">
      {/* Elemen Video Stream */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover max-h-[360px] ${aktif ? "block" : "hidden"}`}
      />

      {/* Bingkai Target Pemindai (Scanner Reticle) */}
      {aktif && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
          <div className="w-56 h-56 border-2 border-white/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
            {/* Sudut-Sudut Aksen */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-status-tersedia rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-status-tersedia rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-status-tersedia rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-status-tersedia rounded-br-lg" />

            {/* Garis Laser Animasi */}
            <div className="absolute left-2 right-2 h-0.5 bg-status-tersedia shadow-[0_0_12px_rgba(46,125,50,1)] animate-pulse top-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 px-3 py-1 rounded-full bg-black/70 text-white text-xs font-mono backdrop-blur-sm">
            {label}
          </p>
        </div>
      )}

      {/* Pesan Kesalahan / Peringatan Kompatibilitas */}
      {errorMsg ? (
        <div className="p-6 text-center space-y-3 text-white max-w-sm">
          <AlertCircle className="w-10 h-10 text-danger mx-auto" />
          <h4 className="font-serif font-bold text-base">Kamera Tidak Tersedia</h4>
          <p className="text-xs text-white/80 leading-relaxed">{errorMsg}</p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={mulaiKamera}
              className="px-4 py-2 rounded-lg bg-white text-ink text-xs font-semibold hover:bg-white/90 inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/20 text-white text-xs font-semibold hover:bg-white/30"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      ) : !detectorTersedia && aktif ? (
        <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-lg bg-amber-500/90 text-white text-[11px] font-mono text-center">
          Peringatan: Browser ini belum mendukung BarcodeDetector API native. Gunakan pemindai USB jika kamera tidak otomatis merespons.
        </div>
      ) : null}

      {/* Tombol Tutup / Matikan Kamera */}
      {onClose && (
        <button
          onClick={() => {
            hentikanKamera();
            onClose();
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-20"
          title="Tutup Pemindai Kamera"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
