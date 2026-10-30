import Link from "next/link";
import {
  LayoutDashboard,
  Repeat,
  BookMarked,
  Users,
  Settings,
  ShieldCheck,
  LogOut,
  BookOpen,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row pb-20 md:pb-0">
      {/* 1. Sidebar Tetap Desktop */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-surface border-r border-line p-5 shrink-0 min-h-screen">
        <div className="space-y-6">
          {/* Logo & Judul Admin */}
          <Link href="/admin" className="flex items-center gap-2.5 pb-4 border-b border-line">
            <div className="w-8 h-8 rounded bg-ink text-paper flex items-center justify-center font-serif font-bold text-base">
              B
            </div>
            <div>
              <span className="font-serif font-semibold text-lg block leading-none text-ink">
                Bilik Baca
              </span>
              <span className="font-mono text-[10px] text-ink-muted uppercase tracking-wider block mt-0.5">
                Panel Staf & Admin
              </span>
            </div>
          </Link>

          {/* Menu Navigasi Utama */}
          <nav className="space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-ink hover:bg-paper-sunken transition-colors min-h-[44px]"
            >
              <LayoutDashboard className="w-4 h-4 text-ink-muted" />
              <span>Ringkasan</span>
            </Link>

            <Link
              href="/admin/sirkulasi"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-ink hover:bg-paper-sunken transition-colors min-h-[44px]"
            >
              <Repeat className="w-4 h-4 text-ink-muted" />
              <span>Sirkulasi (Pinjam/Kembali)</span>
            </Link>

            <Link
              href="/admin/buku"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-ink hover:bg-paper-sunken transition-colors min-h-[44px]"
            >
              <BookMarked className="w-4 h-4 text-ink-muted" />
              <span>Katalog & Eksemplar</span>
            </Link>

            <Link
              href="/admin/anggota"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-ink hover:bg-paper-sunken transition-colors min-h-[44px]"
            >
              <Users className="w-4 h-4 text-ink-muted" />
              <span>Data Anggota</span>
            </Link>

            <Link
              href="/admin/pengaturan"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-ink hover:bg-paper-sunken transition-colors min-h-[44px]"
            >
              <Settings className="w-4 h-4 text-ink-muted" />
              <span>Pengaturan Sistem</span>
            </Link>
          </nav>
        </div>

        {/* Profil Petugas & Aksi Logout */}
        <div className="pt-4 border-t border-line space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-status-tersedia" />
              <div className="text-left">
                <p className="text-xs font-semibold text-ink leading-tight">Admin Utama</p>
                <span className="font-mono text-[10px] text-ink-muted">Role: Admin</span>
              </div>
            </div>
            <Link
              href="/"
              title="Lihat Katalog Publik"
              className="p-2 rounded text-ink-muted hover:text-ink hover:bg-paper-sunken min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <BookOpen className="w-4 h-4" />
            </Link>
          </div>

          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 rounded-md transition-colors min-h-[44px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* 2. Area Konten Utama Admin */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-surface/80 backdrop-blur-sm border-b border-line px-6 py-3.5 flex items-center justify-between md:justify-end">
          <Link href="/admin" className="md:hidden font-serif font-bold text-base text-ink">
            Bilik Baca Admin
          </Link>
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="font-mono">Server Lokal (Laragon)</span>
            <span className="w-2 h-2 rounded-full bg-status-tersedia" />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</main>
      </div>

      {/* 3. Bottom Bar Mobile Admin (Maksimal 5 item) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-line px-2 py-2 flex items-center justify-around shadow-lg">
        <Link
          href="/admin"
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-[10px] font-medium text-ink"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/admin/sirkulasi"
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-[10px] font-medium text-ink-muted hover:text-ink"
        >
          <Repeat className="w-5 h-5" />
          <span>Sirkulasi</span>
        </Link>
        <Link
          href="/admin/buku"
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-[10px] font-medium text-ink-muted hover:text-ink"
        >
          <BookMarked className="w-5 h-5" />
          <span>Buku</span>
        </Link>
        <Link
          href="/admin/anggota"
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-[10px] font-medium text-ink-muted hover:text-ink"
        >
          <Users className="w-5 h-5" />
          <span>Anggota</span>
        </Link>
        <Link
          href="/"
          className="flex flex-col items-center gap-1 py-1 px-2.5 text-[10px] font-medium text-ink-muted hover:text-ink"
        >
          <BookOpen className="w-5 h-5" />
          <span>Katalog</span>
        </Link>
      </nav>
    </div>
  );
}
