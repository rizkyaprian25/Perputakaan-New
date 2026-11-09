"use client";

/**
 * Perpustakaan NETRI - Komponen Pemindai Kamera Webcam Live (QR & Barcode)
 * Menggunakan hibrida BarcodeDetector API native + jsQR Dual-Pass (Center-Crop HD + Full-Frame)
 * sehingga membaca QR Code kartu siswa & stiker buku dengan cepat di semua browser,
 * bebas kedip (zero-flicker), bebas Console AbortError, dan tanpa teks peringatan apa pun.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { X, AlertCircle, RefreshCw, Camera } from "lucide-react";
import jsQR from "jsqr";

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
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasFullRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCropRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const timerScanRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerBootRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<number>(0);
  const terakhirScannedRef = useRef<{ kode: string; waktu: number }>({ kode: "", waktu: 0 });

  // Simpan callback di ref agar perubahan fungsi di parent tidak pernah mereset stream kamera
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const autoStopRef = useRef(autoStopOnScan);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
    autoStopRef.current = autoStopOnScan;
  }, [onScan, onClose, autoStopOnScan]);

  // Fungsi membunyikan beep singkat via Web Audio API saat scan berhasil
  const bunyikanBeep = useCallback(() => {
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
      // Abaikan jika audio diblokir kebijakan browser
    }
  }, []);

  // Matikan hanya track hardware dan timer tanpa memicu load request baru pada elemen <video>
  const matikanStreamSaja = useCallback(() => {
    if (timerBootRef.current) {
      clearTimeout(timerBootRef.current);
      timerBootRef.current = null;
    }
    if (timerScanRef.current) {
      clearInterval(timerScanRef.current);
      timerScanRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Abaikan
        }
      });
      streamRef.current = null;
    }
  }, []);

  // Hentikan kamera secara penuh
  const hentikanKamera = useCallback(() => {
    sessionIdRef.current += 1;
    matikanStreamSaja();
    setAktif(false);
    setSedangMemuat(false);
  }, [matikanStreamSaja]);

  // Inisialisasi kamera yang aman terhadap React StrictMode & bebas AbortError
  const mulaiKamera = useCallback(async () => {
    const mySessionId = ++sessionIdRef.current;
    matikanStreamSaja();
    setErrorMsg(null);
    setSedangMemuat(true);

    // Siapkan BarcodeDetector native jika ada (sebagai akselerasi tambahan di samping jsQR)
    if (typeof window !== "undefined" && "BarcodeDetector" in window && !detectorRef.current) {
      try {
        detectorRef.current = new (window as any).BarcodeDetector({
          formats: ["qr_code", "code_128", "code_39", "ean_13"],
        });
      } catch {
        detectorRef.current = null;
      }
    }

    try {
      // Minta resolusi HD (1280x720) agar modul QR kecil pada kartu siswa/stiker buku terlihat tajam
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      // Jika sesi ini sudah dibatalkan saat menunggu perangkat webcam, segera lepaskan kamera
      if (mySessionId !== sessionIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const videoEl = videoRef.current;

      if (videoEl) {
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
        }

        // Tunggu metadata frame pertama siap sebelum memanggil play()
        if (videoEl.readyState < 1) {
          await new Promise<void>((resolve) => {
            const onLoaded = () => {
              videoEl.removeEventListener("loadedmetadata", onLoaded);
              resolve();
            };
            videoEl.addEventListener("loadedmetadata", onLoaded);
            setTimeout(() => {
              videoEl.removeEventListener("loadedmetadata", onLoaded);
              resolve();
            }, 400);
          });
        }

        if (mySessionId !== sessionIdRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoEl.paused) {
          const playPromise = videoEl.play();
          if (playPromise !== undefined) {
            await playPromise.catch(() => {
              // Tangkap langsung agar tidak pernah memicu Next.js Console AbortError overlay
            });
          }
        }
      }

      if (mySessionId !== sessionIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      setAktif(true);
      setSedangMemuat(false);

      // Loop pemindaian cerdas setiap 140 ms (BarcodeDetector native + Dual-Pass jsQR Canvas)
      timerScanRef.current = setInterval(async () => {
        const v = videoRef.current;
        if (!v || v.readyState < 2 || v.videoWidth === 0 || v.videoHeight === 0) {
          return;
        }

        let terdeteksi: string | null = null;

        // 1. Coba melalui BarcodeDetector native jika tersedia
        if (detectorRef.current) {
          try {
            const barcodes = await detectorRef.current.detect(v);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              terdeteksi = String(barcodes[0].rawValue).trim();
            }
          } catch {
            // Lanjut ke mesin jsQR
          }
        }

        // 2. Pass 1 jsQR: Center-Crop Resolusi Asli 1:1 (fokus pada area kotak tengah pemindai)
        //    Sangat efektif membaca QR code berukuran 21mm-24mm pada kartu siswa & stiker buku!
        if (!terdeteksi) {
          try {
            if (!canvasCropRef.current) {
              canvasCropRef.current = document.createElement("canvas");
            }
            const cropCanvas = canvasCropRef.current;
            const minDim = Math.min(v.videoWidth, v.videoHeight);
            const cropSize = Math.max(240, Math.round(minDim * 0.68));
            const sx = Math.round((v.videoWidth - cropSize) / 2);
            const sy = Math.round((v.videoHeight - cropSize) / 2);

            const outSize = Math.min(520, cropSize);
            if (cropCanvas.width !== outSize) cropCanvas.width = outSize;
            if (cropCanvas.height !== outSize) cropCanvas.height = outSize;

            const ctxCrop = cropCanvas.getContext("2d", { willReadFrequently: true });
            if (ctxCrop) {
              ctxCrop.drawImage(v, sx, sy, cropSize, cropSize, 0, 0, outSize, outSize);
              const imgCrop = ctxCrop.getImageData(0, 0, outSize, outSize);
              const codeCrop = jsQR(imgCrop.data, imgCrop.width, imgCrop.height, {
                inversionAttempts: "attemptBoth",
              });
              if (codeCrop && codeCrop.data && codeCrop.data.trim()) {
                terdeteksi = codeCrop.data.trim();
              }
            }
          } catch {
            // Abaikan
          }
        }

        // 3. Pass 2 jsQR: Full-Frame (jika kartu QR berada sedikit di pinggir luar kotak tengah)
        if (!terdeteksi) {
          try {
            if (!canvasFullRef.current) {
              canvasFullRef.current = document.createElement("canvas");
            }
            const fullCanvas = canvasFullRef.current;
            const targetW = Math.min(640, v.videoWidth);
            const targetH = Math.round((v.videoHeight / v.videoWidth) * targetW);
            if (fullCanvas.width !== targetW) fullCanvas.width = targetW;
            if (fullCanvas.height !== targetH) fullCanvas.height = targetH;

            const ctxFull = fullCanvas.getContext("2d", { willReadFrequently: true });
            if (ctxFull) {
              ctxFull.drawImage(v, 0, 0, targetW, targetH);
              const imgFull = ctxFull.getImageData(0, 0, targetW, targetH);
              const codeFull = jsQR(imgFull.data, imgFull.width, imgFull.height, {
                inversionAttempts: "attemptBoth",
              });
              if (codeFull && codeFull.data && codeFull.data.trim()) {
                terdeteksi = codeFull.data.trim();
              }
            }
          } catch {
            // Abaikan frame yang gagal diproses
          }
        }

        if (terdeteksi) {
          const now = Date.now();
          if (
            terakhirScannedRef.current.kode === terdeteksi &&
            now - terakhirScannedRef.current.waktu < 1800
          ) {
            return;
          }

          terakhirScannedRef.current = { kode: terdeteksi, waktu: now };
          bunyikanBeep();
          onScanRef.current(terdeteksi);

          if (autoStopRef.current) {
            hentikanKamera();
            if (onCloseRef.current) onCloseRef.current();
          }
        }
      }, 140);
    } catch (err: any) {
      if (mySessionId !== sessionIdRef.current || err?.name === "AbortError") {
        return;
      }
      setSedangMemuat(false);
      setAktif(false);
      setErrorMsg(
        err?.name === "NotAllowedError"
          ? "Izin akses kamera ditolak oleh browser. Klik ikon gembok di bilah alamat browser lalu izinkan Kamera."
          : "Perangkat kamera webcam tidak ditemukan atau sedang digunakan oleh aplikasi lain."
      );
      matikanStreamSaja();
    }
  }, [bunyikanBeep, hentikanKamera, matikanStreamSaja]);

  useEffect(() => {
    // Jeda 80ms mencegah siklus mount-unmount-mount instan React StrictMode membuka webcam 2 kali bersamaan
    timerBootRef.current = setTimeout(() => {
      mulaiKamera();
    }, 80);

    return () => {
      sessionIdRef.current += 1;
      matikanStreamSaja();
    };
  }, [mulaiKamera, matikanStreamSaja]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-ink border border-line flex flex-col items-center justify-center h-[320px] w-full shadow-lg select-none">
      {/* Elemen Video Stream selalu ter-render di DOM (tanpa toggle hidden/block agar tidak berkedip) */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          aktif && !errorMsg ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Indikator Memuat Kamera Halus */}
      {sedangMemuat && !errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-white/85 bg-ink z-10">
          <Camera className="w-8 h-8 animate-pulse text-status-tersedia" />
          <span className="font-mono text-xs tracking-wide">Menghubungkan lensa kamera...</span>
        </div>
      )}

      {/* Bingkai Target Pemindai (Scanner Reticle) - Bersih Tanpa Kotak Peringatan */}
      {aktif && !errorMsg && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-10">
          <div className="w-52 h-52 border-2 border-white/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.42)]">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-status-tersedia rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-status-tersedia rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-status-tersedia rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-status-tersedia rounded-br-lg" />

            {/* Garis Laser Animasi */}
            <div className="absolute left-2 right-2 h-0.5 bg-status-tersedia shadow-[0_0_12px_rgba(46,125,50,1)] animate-pulse top-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-3.5 px-3.5 py-1 rounded-full bg-black/75 text-white text-xs font-mono backdrop-blur-sm">
            {label}
          </p>
        </div>
      )}

      {/* Pesan Kesalahan Jika Kamera Benar-Benar Tidak Ada / Ditolak */}
      {errorMsg && (
        <div className="absolute inset-0 p-6 text-center flex flex-col items-center justify-center space-y-3 text-white bg-ink z-20">
          <AlertCircle className="w-10 h-10 text-danger mx-auto" />
          <h4 className="font-serif font-bold text-base">Kamera Tidak Tersedia</h4>
          <p className="text-xs text-white/80 leading-relaxed max-w-sm">{errorMsg}</p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => mulaiKamera()}
              className="px-4 py-2 rounded-lg bg-white text-ink text-xs font-semibold hover:bg-white/90 inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={() => {
                  hentikanKamera();
                  onClose();
                }}
                className="px-4 py-2 rounded-lg bg-white/20 text-white text-xs font-semibold hover:bg-white/30"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tombol Tutup / Matikan Kamera */}
      {onClose && (
        <button
          type="button"
          onClick={() => {
            hentikanKamera();
            onClose();
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-30"
          title="Tutup Pemindai Kamera"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
