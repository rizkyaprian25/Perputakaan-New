import Link from "next/link";
import { BookOpen, Search, QrCode, Shield, Compass } from "lucide-react";

export default function KatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink pb-20 md:pb-0">
      {/* Header Publik */}
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-sm border-b border-line px-4 md:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-md bg-ink text-paper flex items-center justify-center font-serif font-bold text-lg">
              B
            </div>
            <div>
              <span className="font-serif font-semibold text-xl tracking-tight block leading-none">
                Bilik Baca
              </span>
              <span className="font-mono text-[11px] text-ink-muted tracking-wide block mt-0.5">
                Perpustakaan Sekolah
              </span>
            </div>
          </Link>

          {/* Navigasi Desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-ink-muted transition-colors">
              Beranda
            </Link>
            <Link href="/katalog/hiburan" className="hover:text-group-hiburan transition-colors">
              Bacaan Hiburan
            </Link>
            <Link href="/katalog/pelajaran" className="hover:text-group-pelajaran transition-colors">
              Buku Pelajaran
            </Link>
            <Link
              href="/kiosk"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-line bg-surface hover:bg-paper-sunken transition-colors"
            >
              <QrCode className="w-4 h-4 text-ink-muted" />
              <span>Kiosk Absensi</span>
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Portal Staf</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Konten Halaman */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">{children}</main>

      {/* Footer Publik */}
      <footer className="border-t border-line bg-paper-sunken/60 py-8 px-4 md:px-8 text-xs text-ink-muted mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="font-medium text-ink">Bilik Baca</span> — Sistem Informasi Koleksi & Sirkulasi Perpustakaan Sekolah.
          </div>
          <p className="font-mono">Jam Layanan: Senin - Jumat, 07.30 - 15.00 WIB</p>
        </div>
      </footer>

      {/* Bottom Bar Khusus Mobile (Maksimal 4 item) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-line px-2 py-2 flex items-center justify-around shadow-lg">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium text-ink"
        >
          <Compass className="w-5 h-5" />
          <span>Beranda</span>
        </Link>
        <Link
          href="/katalog/hiburan"
          className="flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium text-ink-muted hover:text-group-hiburan"
        >
          <BookOpen className="w-5 h-5" />
          <span>Hiburan</span>
        </Link>
        <Link
          href="/katalog/pelajaran"
          className="flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium text-ink-muted hover:text-group-pelajaran"
        >
          <Search className="w-5 h-5" />
          <span>Pelajaran</span>
        </Link>
        <Link
          href="/kiosk"
          className="flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium text-ink-muted"
        >
          <QrCode className="w-5 h-5" />
          <span>Kiosk</span>
        </Link>
      </nav>
    </div>
  );
}
