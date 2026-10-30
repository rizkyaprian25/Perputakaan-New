import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between selection:bg-ink selection:text-paper">
      {/* Header Kiosk */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-line bg-paper-sunken/40">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-ink-muted hover:text-ink transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Publik</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-status-tersedia animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            Kiosk Presensi Aktif
          </span>
        </div>
      </header>

      {/* Main Kiosk Area */}
      <main className="flex-1 flex flex-col justify-center p-4 md:p-8 max-w-6xl w-full mx-auto">
        {children}
      </main>

      {/* Footer Kiosk */}
      <footer className="px-6 py-3 border-t border-line text-center text-xs text-ink-muted font-mono">
        Bilik Baca Kiosk v1.0 • Pindai kartu QR Anda atau masukkan NIS/NIP pada kolom yang tersedia
      </footer>
    </div>
  );
}
