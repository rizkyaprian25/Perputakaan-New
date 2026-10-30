"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Catat error ke konsol lokal (tanpa membocorkan ke pengguna akhir)
    console.error("Terjadi kesalahan pada aplikasi:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface border border-line rounded-lg p-6 md:p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-ink mb-2">
          Ada kendala saat memuat halaman
        </h2>
        <p className="text-ink-muted text-sm leading-relaxed mb-6">
          Sistem mengalami kendala tak terduga. Silakan coba muat ulang atau kembali beberapa saat lagi.
        </p>

        {error.digest && (
          <p className="font-mono text-xs text-ink-muted/70 bg-paper-sunken px-3 py-1.5 rounded mb-6 inline-block">
            Kode Tiket: {error.digest}
          </p>
        )}

        <div>
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink/90 transition-colors w-full min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Muat Ulang
          </button>
        </div>
      </div>
    </div>
  );
}
