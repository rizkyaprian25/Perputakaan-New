import Link from "next/link";
import { ArrowLeft, Monitor } from "lucide-react";

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen bg-paper text-ink flex flex-col justify-between overflow-hidden selection:bg-ink selection:text-paper">
      {/* Header Kiosk Desktop */}
      <header className="px-8 py-4 flex items-center justify-between border-b border-line bg-paper-sunken/40 shrink-0">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink transition-colors px-3 py-2 rounded-md hover:bg-paper-sunken min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Perpustakaan</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-tersedia/10 border border-status-tersedia/20 text-status-tersedia text-xs font-mono font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-status-tersedia animate-pulse" />
            <span>Kiosk Presensi Aktif</span>
          </div>
          <span className="font-mono text-xs text-ink-muted flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5" />
            PC Kiosk Standalone
          </span>
        </div>
      </header>

      {/* Main Kiosk Viewport Landscape */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-8 flex flex-col justify-center overflow-hidden">
        {children}
      </main>

      {/* Footer Kiosk Desktop */}
      <footer className="px-8 py-3.5 border-t border-line flex items-center justify-between text-xs text-ink-muted font-mono bg-paper-sunken/30 shrink-0">
        <span>Perpustakaan NETRI • Anjungan Presensi Mandiri Siswa v2.0 • Mendukung Kamera & Pemindai Barcode USB</span>
        <span>Arahkan kartu anggota Perpustakaan NETRI ke pemindai atau ketikkan NIS siswa</span>
      </footer>
    </div>
  );
}
