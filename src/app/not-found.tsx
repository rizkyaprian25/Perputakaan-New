import Link from "next/link";
import { BookOpen, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface border border-line rounded-lg p-6 md:p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-paper-sunken text-ink flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6" />
        </div>
        <p className="font-mono text-xs uppercase tracking-wider text-ink-muted mb-1">Galat 404</p>
        <h1 className="font-serif text-3xl font-semibold text-ink mb-2">Halaman Tidak Ditemukan</h1>
        <p className="text-ink-muted text-sm leading-relaxed mb-6">
          Buku atau halaman yang Anda cari mungkin telah dipindahkan, dihapus, atau belum terdaftar di
          sistem katalog Bilik Baca.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink/90 transition-colors w-full min-h-[44px]"
        >
          <Home className="w-4 h-4" />
          Kembali ke Beranda Katalog
        </Link>
      </div>
    </div>
  );
}
