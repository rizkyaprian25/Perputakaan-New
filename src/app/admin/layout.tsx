"use client";

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
  Monitor,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper flex">
      {/* 1. Sidebar Tetap Desktop (Permanen di Sisi Kiri) */}
      <aside className="w-64 bg-surface border-r border-line p-6 flex flex-col justify-between shrink-0 min-h-screen shadow-sm">
        <div className="space-y-8">
          {/* Logo & Judul Panel Admin */}
          <Link href="/admin" className="flex items-center gap-3 pb-6 border-b border-line">
            <div className="w-9 h-9 rounded-md bg-ink text-paper flex items-center justify-center font-serif font-bold text-lg shadow-sm">
              B
            </div>
            <div>
              <span className="font-serif font-semibold text-xl block leading-none text-ink">
                Bilik Baca
              </span>
              <span className="font-mono text-[10px] text-ink-muted uppercase tracking-widest block mt-1">
                Panel Staf & Admin
              </span>
            </div>
          </Link>

          {/* Menu Navigasi Utama Komputer */}
          <nav className="space-y-1.5">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-paper-sunken transition-colors min-h-[44px]"
            >
              <LayoutDashboard className="w-4 h-4 text-ink-muted" />
              <span>Ringkasan Dashboard</span>
            </Link>

            <Link
              href="/admin/sirkulasi"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-paper-sunken transition-colors min-h-[44px]"
            >
              <Repeat className="w-4 h-4 text-ink-muted" />
              <span>Meja Sirkulasi (Pinjam/Kembali)</span>
            </Link>

            <Link
              href="/admin/buku"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-paper-sunken transition-colors min-h-[44px]"
            >
              <BookMarked className="w-4 h-4 text-ink-muted" />
              <span>Katalog & Eksemplar</span>
            </Link>

            <Link
              href="/admin/anggota"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-paper-sunken transition-colors min-h-[44px]"
            >
              <Users className="w-4 h-4 text-ink-muted" />
              <span>Data Anggota Siswa</span>
            </Link>

            <Link
              href="/admin/pengaturan"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-paper-sunken transition-colors min-h-[44px]"
            >
              <Settings className="w-4 h-4 text-ink-muted" />
              <span>Pengaturan Sistem</span>
            </Link>
          </nav>
        </div>

        {/* Profil Petugas & Aksi Logout */}
        <div className="pt-6 border-t border-line space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-status-tersedia/15 text-status-tersedia flex items-center justify-center font-bold text-xs">
                A
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-ink leading-tight">Admin Utama</p>
                <span className="font-mono text-[10px] text-ink-muted">Petugas Perpustakaan</span>
              </div>
            </div>

            <Link
              href="/"
              title="Buka Katalog Publik"
              className="p-2 rounded-md text-ink-muted hover:text-ink hover:bg-paper-sunken min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
            >
              <BookOpen className="w-4 h-4" />
            </Link>
          </div>

          <button
            onClick={async () => {
              try {
                await fetch("/api/v1/auth/logout", { method: "POST" });
              } catch {}
              window.location.href = "/admin/login";
            }}
            className="flex items-center gap-2 w-full px-3.5 py-2.5 text-xs font-semibold text-danger hover:bg-danger/10 rounded-md transition-colors min-h-[44px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sesi Komputer</span>
          </button>
        </div>
      </aside>

      {/* 2. Area Konten Utama Desktop */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-surface/90 backdrop-blur-sm border-b border-line px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif font-bold text-lg text-ink">Bilik Baca</span>
            <span className="text-ink-muted">/</span>
            <span className="font-mono text-xs text-ink-muted">Workstation Petugas</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-ink-muted">
            <div className="flex items-center gap-2 bg-paper-sunken/60 px-3 py-1.5 rounded-md border border-line">
              <Monitor className="w-3.5 h-3.5" />
              <span>Server Lokal Laragon (127.0.0.1:3306)</span>
            </div>
            <div className="flex items-center gap-1.5 text-status-tersedia font-semibold">
              <span className="w-2 h-2 rounded-full bg-status-tersedia" />
              <span>Aktif</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
