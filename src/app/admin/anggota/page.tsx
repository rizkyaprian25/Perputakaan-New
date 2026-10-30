import { UserPlus, FileSpreadsheet, QrCode, Search } from "lucide-react";
import { db } from "@/db";
import { anggota } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminAnggotaPage() {
  let daftarAnggota: Array<{
    id: string;
    nomorInduk: string;
    nama: string;
    jenis: string;
    kelas: string | null;
    status: string;
  }> = [];

  try {
    const raw = await db.select().from(anggota).limit(20);
    daftarAnggota = raw.map((a) => ({
      id: a.id,
      nomorInduk: a.nomorInduk,
      nama: a.nama,
      jenis: a.jenis,
      kelas: a.kelas,
      status: a.status,
    }));
  } catch (error) {
    console.error("Gagal mengambil data anggota:", error);
  }

  return (
    <div className="space-y-8">
      {/* Header Halaman Anggota */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Data Anggota Perpustakaan</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Kelola identitas siswa dan guru, cetak kartu anggota ber-QR, atau impor massal via Excel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-sm font-medium transition-colors min-h-[44px]">
            <FileSpreadsheet className="w-4 h-4 text-status-tersedia" />
            <span>Impor XLSX / CSV</span>
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-ink text-paper text-sm font-medium hover:bg-ink/90 transition-colors min-h-[44px]">
            <UserPlus className="w-4 h-4" />
            <span>Tambah Anggota</span>
          </button>
        </div>
      </div>

      {/* Tabel Anggota */}
      <div className="bg-surface border border-line rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-serif font-semibold text-lg text-ink">Daftar Anggota Aktif</h2>
          <span className="font-mono text-xs text-ink-muted">{daftarAnggota.length} Anggota</span>
        </div>

        {daftarAnggota.length === 0 ? (
          <div className="p-8 text-center text-ink-muted text-sm">
            Belum ada anggota terdaftar di sistem. Unggah file Excel atau tambahkan siswa baru.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-sunken/60 text-ink font-mono uppercase tracking-wider border-b border-line">
                <tr>
                  <th className="py-3 px-4">Nomor Induk</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {daftarAnggota.map((m) => (
                  <tr key={m.id} className="hover:bg-paper-sunken/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-ink">{m.nomorInduk}</td>
                    <td className="py-3 px-4 font-medium text-ink">{m.nama}</td>
                    <td className="py-3 px-4 capitalize font-mono text-ink-muted">{m.jenis}</td>
                    <td className="py-3 px-4 font-mono">{m.kelas || "Umum"}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] bg-status-tersedia/10 text-status-tersedia font-medium">
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button className="px-3 py-1.5 rounded border border-line hover:bg-paper-sunken text-xs font-mono font-medium inline-flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Cetak Kartu</span>
                      </button>
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
