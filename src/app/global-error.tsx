"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="bg-[#F5F0E6] text-[#1C1A17] min-h-screen flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#FFFDF8] border border-[#D6CDB9] rounded-lg p-6 md:p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-[#A3201B]/10 text-[#A3201B] flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Terjadi Gangguan Sistem</h2>
          <p className="text-[#5A554B] text-sm leading-relaxed mb-6">
            Aplikasi mengalami kesalahan fatal pada kerangka utama. Silakan coba muat ulang halaman.
          </p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-[#1C1A17] text-[#F5F0E6] text-sm font-medium w-full min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            Muat Ulang Halaman
          </button>
        </div>
      </body>
    </html>
  );
}
