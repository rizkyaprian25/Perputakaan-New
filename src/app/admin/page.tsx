import Link from "next/link";
import { db, pool } from "@/db";
import { buku, eksemplar, anggota, peminjaman, kunjungan } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { BookOpen, Users, Clock, AlertTriangle, ArrowRight, Repeat, CheckCircle2, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let totalBuku = 0;
  let totalEksemplar = 0;
  let totalAnggota = 0;
  let totalDipinjam = 0;
  let totalKunjunganHariIni = 0;
  let pinjamanTerlambat: any[] = [];
  let sirkulasiTerbaru: any[] = [];

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

    // Ambil daftar pinjaman yang terlambat saat ini
    const [rowsTerlambat]: any = await pool.query(
      `SELECT 
         p.id,
         p.jatuh_tempo as jatuhTempo,
         p.perpanjangan_ke as perpanjanganKe,
         a.nama as namaAnggota,
         a.nomor_induk as nomorInduk,
         a.kelas,
         e.kode as kodeEksemplar,
         b.judul as judulBuku
       FROM peminjaman p
       JOIN anggota a ON p.anggota_id = a.id
       JOIN eksemplar e ON p.eksemplar_id = e.id
       JOIN buku b ON e.buku_id = b.id
       WHERE p.dikembalikan_pada IS NULL AND p.jatuh_tempo < NOW()
       ORDER BY p.jatuh_tempo ASC
       LIMIT 5`
    );

    const now = new Date();
    pinjamanTerlambat = (rowsTerlambat || []).map((item: any) => {
      const jatuhTempoDate = new Date(item.jatuhTempo);
      const selisihHari = Math.ceil(
        (now.getTime() - jatuhTempoDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        ...item,
        selisihHari,
      };
    });

    // Ambil 5 aktivitas sirkulasi terbaru
    const [rowsTerbaru]: any = await pool.query(
      `SELECT 
         p.id,
         p.dipinjam_pada as dipinjamPada,
         p.dikembalikan_pada as dikembalikanPada,
         a.nama as namaAnggota,
         a.kelas,
         e.kode as kodeEksemplar,
         b.judul as judulBuku
       FROM peminjaman p
       JOIN anggota a ON p.anggota_id = a.id
       JOIN eksemplar e ON p.eksemplar_id = e.id
       JOIN buku b ON e.buku_id = b.id
       ORDER BY p.dipinjam_pada DESC
       LIMIT 5`
    );
    sirkulasiTerbaru = rowsTerbaru || [];
  } catch (error) {
    console.error("Gagal mengambil metrik dashboard admin:", error);
  }

  return (
    <div className="space-y-8 max-w-[1440px]">
      {/* Judul Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Ringkasan Perpustakaan</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Ikhtisar operasional koleksi, kehadiran siswa, dan sirkulasi hari ini.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/laporan"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-sm font-medium transition-colors shrink-0 min-h-[44px]"
          >
            <span>Buka Pusat Laporan</span>
          </Link>
          <Link
            href="/admin/sirkulasi"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink/90 transition-colors shrink-0 min-h-[44px]"
          >
            <Repeat className="w-4 h-4" />
            <span>Buka Meja Sirkulasi</span>
          </Link>
        </div>
      </div>

      {/* Grid Metrik Angka Tabular */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Koleksi Buku */}
        <div className="bg-surface border border-line rounded-xl p-5 shadow-sm space-y-2">
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
        <div className="bg-surface border border-line rounded-xl p-5 shadow-sm space-y-2">
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
        <div className="bg-surface border border-line rounded-xl p-5 shadow-sm space-y-2">
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
        <div className="bg-surface border border-line rounded-xl p-5 shadow-sm space-y-2">
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

      {/* Grid Dua Kolom: Peringatan Keterlambatan & Aktivitas Terkini */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri (6 Kolom): Peringatan Keterlambatan Pinjaman */}
        <div className="lg:col-span-6 bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <h3 className="font-serif font-bold text-base text-ink">
                Peringatan Terlambat ({pinjamanTerlambat.length})
              </h3>
            </div>
            <Link
              href="/admin/sirkulasi"
              className="text-xs text-ink-muted hover:text-ink font-medium inline-flex items-center gap-1"
            >
              <span>Meja Sirkulasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-line/60">
            {pinjamanTerlambat.length === 0 ? (
              <div className="p-8 text-center text-xs text-status-tersedia flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6" />
                <span>Semua peminjaman buku dalam batas waktu aman (tidak ada keterlambatan).</span>
              </div>
            ) : (
              pinjamanTerlambat.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm text-ink truncate">{item.judulBuku}</h4>
                    <p className="font-mono text-xs text-ink-muted mt-0.5">
                      Peminjam: <strong className="text-ink">{item.namaAnggota}</strong> ({item.kelas || "Umum"}) • Kode: {item.kodeEksemplar}
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded bg-danger/10 text-danger font-mono font-bold text-xs">
                    +{item.selisihHari} hr
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom Kanan (6 Kolom): Aktivitas Sirkulasi Terkini */}
        <div className="lg:col-span-6 bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-ink">
              Aktivitas Sirkulasi Terbaru
            </h3>
            <Link
              href="/admin/laporan"
              className="text-xs text-ink-muted hover:text-ink font-medium inline-flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-line/60">
            {sirkulasiTerbaru.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted">
                Belum ada transaksi peminjaman tercatat.
              </div>
            ) : (
              sirkulasiTerbaru.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm text-ink truncate">{item.judulBuku}</h4>
                    <p className="font-mono text-xs text-ink-muted mt-0.5">
                      {item.namaAnggota} ({item.kelas || "Umum"}) • {item.kodeEksemplar}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                      item.dikembalikanPada
                        ? "bg-status-tersedia/10 text-status-tersedia"
                        : "bg-status-dipinjam/10 text-status-dipinjam"
                    }`}
                  >
                    {item.dikembalikanPada ? "Dikembalikan" : "Dipinjam"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Panel Navigasi Cepat Sirkulasi */}
      <div className="bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4">
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
            className="p-4 rounded-lg border border-line hover:border-ink/50 bg-paper/50 hover:bg-paper transition-all flex flex-col justify-between min-h-[100px]"
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
            className="p-4 rounded-lg border border-line hover:border-ink/50 bg-paper/50 hover:bg-paper transition-all flex flex-col justify-between min-h-[100px]"
          >
            <div>
              <h4 className="font-serif font-semibold text-sm text-ink">Tambah Buku & Eksemplar</h4>
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
            className="p-4 rounded-lg border border-line hover:border-ink/50 bg-paper/50 hover:bg-paper transition-all flex flex-col justify-between min-h-[100px]"
          >
            <div>
              <h4 className="font-serif font-semibold text-sm text-ink">Cetak Kartu QR & Impor</h4>
              <p className="text-xs text-ink-muted mt-1">
                Cetak kartu massal A4 per kelas atau sinkronkan data siswa Netri SMS.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink mt-3">
              Kelola anggota <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
