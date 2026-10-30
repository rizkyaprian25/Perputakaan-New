import { Repeat, QrCode, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { peminjaman, anggota, eksemplar, buku } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { BadgeStatus } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function SirkulasiPage() {
  // Ambil daftar pinjaman yang masih aktif (belum dikembalikan)
  let pinjamanAktif: Array<{
    id: string;
    namaPeminjam: string;
    nomorInduk: string;
    judulBuku: string;
    kodeEksemplar: string;
    dipinjamPada: string;
    jatuhTempo: string;
    terlambat: boolean;
  }> = [];

  try {
    const rawPinjam = await db
      .select({
        id: peminjaman.id,
        namaPeminjam: anggota.nama,
        nomorInduk: anggota.nomorInduk,
        judulBuku: buku.judul,
        kodeEksemplar: eksemplar.kode,
        dipinjamPada: peminjaman.dipinjamPada,
        jatuhTempo: peminjaman.jatuhTempo,
      })
      .from(peminjaman)
      .innerJoin(anggota, eq(peminjaman.anggotaId, anggota.id))
      .innerJoin(eksemplar, eq(peminjaman.eksemplarId, eksemplar.id))
      .innerJoin(buku, eq(eksemplar.bukuId, buku.id))
      .where(sql`${peminjaman.dikembalikanPada} IS NULL`)
      .limit(10);

    const now = new Date();
    pinjamanAktif = rawPinjam.map((p) => ({
      id: p.id,
      namaPeminjam: p.namaPeminjam,
      nomorInduk: p.nomorInduk,
      judulBuku: p.judulBuku,
      kodeEksemplar: p.kodeEksemplar,
      dipinjamPada: new Date(p.dipinjamPada).toLocaleDateString("id-ID"),
      jatuhTempo: new Date(p.jatuhTempo).toLocaleDateString("id-ID"),
      terlambat: new Date(p.jatuhTempo) < now,
    }));
  } catch (error) {
    console.error("Gagal mengambil data sirkulasi:", error);
  }

  return (
    <div className="space-y-8">
      {/* Header Sirkulasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Meja Sirkulasi Buku</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Pencatatan peminjaman dan pengembalian buku dengan pemindaian barcode/QR.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-ink text-paper text-sm font-medium min-h-[44px]">
            <QrCode className="w-4 h-4" />
            <span>Mode Scan Buku</span>
          </button>
        </div>
      </div>

      {/* Dua Panel Alur: Pinjam Cepat vs Kembali Cepat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel Peminjaman */}
        <div className="bg-surface border border-line rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="font-serif font-semibold text-lg text-ink">Peminjaman Baru</h2>
            <span className="font-mono text-xs text-ink-muted">Langkah 1 dari 2</span>
          </div>

          <p className="text-xs text-ink-muted leading-relaxed">
            Arahkan scanner USB atau kamera ke kartu anggota siswa. Sistem akan otomatis membuka
            keranjang peminjaman.
          </p>

          <div className="p-4 bg-paper-sunken/40 border border-dashed border-line rounded-md text-center">
            <QrCode className="w-10 h-10 text-ink-muted mx-auto mb-2" />
            <span className="font-mono text-xs text-ink-muted block">Menunggu Scan Kartu Siswa...</span>
          </div>
        </div>

        {/* Panel Pengembalian */}
        <div className="bg-surface border border-line rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="font-serif font-semibold text-lg text-ink">Pengembalian Buku</h2>
            <span className="font-mono text-xs text-status-tersedia">Satu Langkah Saja</span>
          </div>

          <p className="text-xs text-ink-muted leading-relaxed">
            Scan langsung label QR di punggung buku yang dikembalikan siswa. Status eksemplar akan
            otomatis kembali <strong>tersedia</strong>.
          </p>

          <div className="p-4 bg-paper-sunken/40 border border-dashed border-line rounded-md text-center">
            <Repeat className="w-10 h-10 text-ink-muted mx-auto mb-2" />
            <span className="font-mono text-xs text-ink-muted block">Scan QR Eksemplar Buku...</span>
          </div>
        </div>
      </div>

      {/* Tabel Pinjaman Aktif */}
      <div className="bg-surface border border-line rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-serif font-semibold text-lg text-ink">Daftar Buku Sedang Dipinjam</h2>
          <span className="font-mono text-xs text-ink-muted">
            {pinjamanAktif.length} Transaksi Terbuka
          </span>
        </div>

        {pinjamanAktif.length === 0 ? (
          <div className="p-8 text-center text-ink-muted text-sm">
            Saat ini tidak ada buku yang sedang dipinjam. Semua eksemplar tersimpan rapi di rak.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-sunken/60 text-ink font-mono uppercase tracking-wider border-b border-line">
                <tr>
                  <th className="py-3 px-4">Peminjam</th>
                  <th className="py-3 px-4">Judul Buku</th>
                  <th className="py-3 px-4">Kode Eksemplar</th>
                  <th className="py-3 px-4">Pinjam</th>
                  <th className="py-3 px-4">Jatuh Tempo</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {pinjamanAktif.map((row) => (
                  <tr key={row.id} className="hover:bg-paper-sunken/20 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-medium text-ink block">{row.namaPeminjam}</span>
                      <span className="font-mono text-ink-muted text-[11px]">{row.nomorInduk}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-ink">{row.judulBuku}</td>
                    <td className="py-3 px-4 font-mono">{row.kodeEksemplar}</td>
                    <td className="py-3 px-4 font-mono">{row.dipinjamPada}</td>
                    <td className="py-3 px-4 font-mono">{row.jatuhTempo}</td>
                    <td className="py-3 px-4 text-center">
                      <BadgeStatus status={row.terlambat ? "terlambat" : "dipinjam"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
