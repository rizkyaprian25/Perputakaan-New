import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, QrCode, Shield, Clock } from "lucide-react";
import { GlobalSearchBar } from "@/components/ui/GlobalSearchBar";

export default function KatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      {/* Header Desktop Widescreen */}
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-md border-b border-line px-8 py-4 shadow-sm">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
          {/* Logo & Identitas Perpustakaan */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-md bg-ink text-paper flex items-center justify-center font-serif font-bold text-xl shadow-sm">
              B
            </div>
            <div>
              <span className="font-serif font-semibold text-2xl tracking-tight block leading-none text-ink">
                Bilik Baca
              </span>
              <span className="font-mono text-xs text-ink-muted tracking-wide block mt-1">
                Katalog Perpustakaan Sekolah
              </span>
            </div>
          </Link>

          {/* Kotak Pencarian Global Desktop */}
          <div className="flex-1 max-w-xl">
            <Suspense fallback={<div className="h-10 w-full rounded-lg bg-surface/50 border border-line animate-pulse" />}>
              <GlobalSearchBar />
            </Suspense>
          </div>

          {/* Menu Navigasi Desktop */}
          <nav className="flex items-center gap-6 text-sm font-medium shrink-0">
            <Link
              href="/"
              className="text-ink hover:text-ink-muted transition-colors py-1 border-b-2 border-ink"
            >
              Beranda
            </Link>
            <Link
              href="/katalog/hiburan"
              className="text-ink-muted hover:text-group-hiburan transition-colors py-1 flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-group-hiburan" />
              <span>Bacaan Hiburan</span>
            </Link>
            <Link
              href="/katalog/pelajaran"
              className="text-ink-muted hover:text-group-pelajaran transition-colors py-1 flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-group-pelajaran" />
              <span>Buku Pelajaran</span>
            </Link>

            <div className="h-5 w-px bg-line" />

            {/* Tombol Kiosk & Portal Petugas */}
            <Link
              href="/kiosk"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink transition-colors text-xs font-semibold"
            >
              <QrCode className="w-4 h-4 text-status-tersedia" />
              <span>Kiosk Absensi</span>
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors font-medium"
            >
              <Shield className="w-4 h-4" />
              <span>Portal Admin</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Konten Utama Desktop */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-8 py-8">{children}</main>

      {/* Footer Desktop */}
      <footer className="border-t border-line bg-paper-sunken/40 py-8 px-8 text-xs text-ink-muted mt-16">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-ink-muted" />
            <span className="font-semibold text-ink">Bilik Baca</span>
            <span>— Sistem Koleksi & Manajemen Perpustakaan Sekolah Berbasis Jaringan Komputer Lokal.</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-status-tersedia" />
              Layanan: Senin - Jumat, 07.30 - 15.00 WIB
            </span>
            <span>Versi Desktop 1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
