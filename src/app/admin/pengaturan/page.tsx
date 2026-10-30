import { db } from "@/db";
import { pengaturan } from "@/db/schema";
import { Settings, Save } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPengaturanPage() {
  let daftarPengaturan: Array<{ kunci: string; nilai: string; keterangan: string | null }> = [];

  try {
    daftarPengaturan = await db.select().from(pengaturan);
  } catch (error) {
    console.error("Gagal mengambil pengaturan:", error);
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="border-b border-line pb-5">
        <h1 className="font-serif text-3xl font-semibold text-ink">Pengaturan Sistem Perpustakaan</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Aturan operasional peminjaman, batas denda keterlambatan, dan kuota sirkulasi buku.
        </p>
      </div>

      <div className="bg-surface border border-line rounded-lg p-6 shadow-sm space-y-6">
        <div className="divide-y divide-line/60">
          {daftarPengaturan.map((set) => (
            <div key={set.kunci} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="font-medium text-sm text-ink block font-mono">
                  {set.kunci}
                </label>
                <p className="text-xs text-ink-muted mt-0.5">{set.keterangan || "-"}</p>
              </div>

              <div className="w-full sm:w-48">
                <input
                  type="text"
                  defaultValue={set.nilai}
                  className="w-full px-3 py-2 rounded-md border border-line bg-paper-sunken/40 font-mono text-sm focus:border-ink"
                  readOnly
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-line flex justify-end">
          <button
            disabled
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-ink text-paper text-sm font-medium opacity-50 cursor-not-allowed min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan (Aktif di Fase 3)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
