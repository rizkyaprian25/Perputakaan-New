import Link from "next/link";
import { db } from "@/db";
import { buku, eksemplar, anggota, peminjaman, kunjungan } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { BookOpen, Users, Clock, AlertTriangle, ArrowRight, Repeat } from "lucide-react";
import { BadgeStatus } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let totalBuku = 0;
  let totalEksemplar = 0;
  let totalAnggota = 0;
  let totalDipinjam = 0;
  let totalKunjunganHariIni = 0;

  try {
    const [bukuRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(buku)
      .where(sql`${buku.dihapusPada} IS NULL`);
    totalBuku = Number(bukuRes?.count || 0);

    const [eksemplarRes] = await db.select({ count: sql<number>`count(*)` }).from(eksemplar);
    totalEksemplar = Number(eksemplarRes?.count || 0);

    const [anggotaRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(anggota)
      .where(eq(anggota.status, "aktif"));
    totalAnggota = Number(anggotaRes?.count || 0);

    const [pinjamRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(peminjaman)
      .where(sql`${peminjaman.dikembalikanPada} IS NULL`);
    totalDipinjam = Number(pinjamRes?.count || 0);

    const hariIni = new Date().toISOString().slice(0, 10);
    const [kunjunganRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(kunjungan)
      .where(sql`${kunjungan.tanggal} = ${hariIni}`);
    totalKunjunganHariIni = Number(kunjunganRes?.count || 0);
  } catch (error) {
    console.error("Gagal mengambil metrik dashboard admin:", error);
  }

  return (
    <div className="space-y-8">
      {/* Judul Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Ringkasan Perpustakaan</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Ikhtisar operasional koleksi, kehadiran siswa, dan sirkulasi hari ini.
          </p>
        </div>

        <Link
          href="/admin/sirkulasi"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink/90 transition-colors shrink-0 min-h-[44px]"
        >
          <Repeat className="w-4 h-4" />
          <span>Buka Meja Sirkulasi</span>
        </Link>
      </div>

      {/* Grid Metrik Angka Tabular */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Koleksi Buku */}
        <div className="bg-surface border border-line rounded-lg p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-medium">Judul Koleksi</span>
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="font-mono text-3xl font-bold text-ink text-right tabular-nums">
            {totalBuku}
          </div>
          <p className="font-mono text-[11px] text-ink-muted text-right">
            Total {totalEksemplar} eksemplar fisik
          </p>
        </div>

        {/* Anggota Aktif */}
        <div className="bg-surface border border-line rounded-lg p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-medium">Anggota Aktif</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="font-mono text-3xl font-bold text-ink text-right tabular-nums">
            {totalAnggota}
          </div>
          <p className="font-mono text-[11px] text-ink-muted text-right">Siswa & Guru Terdaftar</p>
        </div>

        {/* Buku Sedang Dipinjam */}
        <div className="bg-surface border border-line rounded-lg p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-medium">Sedang Dipinjam</span>
            <Clock className="w-4 h-4 text-status-dipinjam" />
          </div>
          <div className="font-mono text-3xl font-bold text-status-dipinjam text-right tabular-nums">
            {totalDipinjam}
          </div>
          <p className="font-mono text-[11px] text-ink-muted text-right">Buku berada di siswa</p>
        </div>

        {/* Kunjungan Hari Ini */}
        <div className="bg-surface border border-line rounded-lg p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-medium">Kunjungan Hari Ini</span>
            <Users className="w-4 h-4 text-status-tersedia" />
          </div>
          <div className="font-mono text-3xl font-bold text-status-tersedia text-right tabular-nums">
            {totalKunjunganHariIni}
          </div>
          <p className="font-mono text-[11px] text-ink-muted text-right">Tercatat via kiosk</p>
        </div>
      </div>

      {/* Panel Navigasi Cepat Sirkulasi */}
      <div className="bg-surface border border-line rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="font-serif font-semibold text-lg text-ink">
              Tindakan Operasional Cepat
            </h3>
            <p className="text-xs text-ink-muted">Aksi harian petugas perpustakaan sekolah</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/admin/sirkulasi"
            className="p-4 rounded-md border border-line hover:border-ink/50 bg-paper/50 hover:bg-paper transition-all flex flex-col justify-between min-h-[100px]"
          >
            <div>
              <h4 className="font-serif font-semibold text-sm text-ink">Catat Peminjaman Buku</h4>
              <p className="text-xs text-ink-muted mt-1">Scan kartu siswa lalu scan eksemplar buku.</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink mt-3">
              Mulai scan <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          <Link
            href="/admin/buku"
            className="p-4 rounded-md border border-line hover:border-ink/50 bg-paper/50 hover:bg-paper transition-all flex flex-col justify-between min-h-[100px]"
          >
            <div>
              <h4 className="font-serif font-semibold text-sm text-ink">Cari Buku Online (+)</h4>
              <p className="text-xs text-ink-muted mt-1">
                Tarik otomatis judul & sinopsis dari Google Books/Open Library.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink mt-3">
              Cari & tambah <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          <Link
            href="/admin/anggota"
            className="p-4 rounded-md border border-line hover:border-ink/50 bg-paper/50 hover:bg-paper transition-all flex flex-col justify-between min-h-[100px]"
          >
            <div>
              <h4 className="font-serif font-semibold text-sm text-ink">Impor Siswa (Excel/CSV)</h4>
              <p className="text-xs text-ink-muted mt-1">
                Unggah daftar nama satu kelas atau satu angkatan sekaligus.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink mt-3">
              Buka form impor <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
