"use client";

/**
 * Bilik Baca - Halaman Pengaturan Sistem Perpustakaan (Interaktif)
 * Mengatur durasi peminjaman buku, batas kuota per anggota, dan tarif denda per hari.
 */

import { useState, useEffect } from "react";
import { Save, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";

export default function AdminPengaturanPage() {
  const [lamaPinjamHari, setLamaPinjamHari] = useState(7);
  const [maksBukuPerAnggota, setMaksBukuPerAnggota] = useState(3);
  const [dendaPerHariRp, setDendaPerHariRp] = useState(1000);
  const [namaPerpustakaan, setNamaPerpustakaan] = useState("Perpustakaan Bilik Baca");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ tipe: "sukses" | "error"; pesan: string } | null>(null);

  const tampilkanToast = (pesan: string, tipe: "sukses" | "error") => {
    setToast({ pesan, tipe });
    setTimeout(() => setToast(null), 4000);
  };

  const muatPengaturan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/pengaturan");
      const json = await res.json();
      if (json.sukses && Array.isArray(json.data)) {
        for (const item of json.data) {
          if (item.kunci === "lama_pinjam_hari") setLamaPinjamHari(Number(item.nilai || 7));
          if (item.kunci === "maks_buku_per_anggota")
            setMaksBukuPerAnggota(Number(item.nilai || 3));
          if (item.kunci === "denda_per_hari_rp") setDendaPerHariRp(Number(item.nilai || 0));
          if (item.kunci === "nama_perpustakaan") setNamaPerpustakaan(item.nilai);
        }
      }
    } catch {
      tampilkanToast("Gagal memuat pengaturan sistem", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    muatPengaturan();
  }, []);

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lamaPinjamHari: Number(lamaPinjamHari),
          maksBukuPerAnggota: Number(maksBukuPerAnggota),
          dendaPerHariRp: Number(dendaPerHariRp),
          namaPerpustakaan: namaPerpustakaan.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal menyimpan pengaturan");
      }

      tampilkanToast(json.pesan, "sukses");
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-lg shadow-lg border flex items-center gap-3 text-sm font-medium animate-fade-in ${
            toast.tipe === "sukses"
              ? "bg-status-tersedia text-white border-status-tersedia/20"
              : "bg-danger text-white border-danger/20"
          }`}
        >
          {toast.tipe === "sukses" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{toast.pesan}</span>
        </div>
      )}

      <div className="border-b border-line pb-5">
        <h1 className="font-serif text-3xl font-semibold text-ink">
          Pengaturan Sistem Perpustakaan
        </h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Aturan operasional peminjaman, batas denda keterlambatan, dan kuota sirkulasi buku.
        </p>
      </div>

      <form
        onSubmit={handleSimpan}
        className="bg-surface border border-line rounded-xl p-6 shadow-sm space-y-6"
      >
        {loading ? (
          <div className="py-10 text-center text-xs font-mono text-ink-muted">
            Memuat konfigurasi sistem...
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {/* Nama Perpustakaan */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="font-semibold text-sm text-ink block">
                  Nama Unit Perpustakaan
                </label>
                <p className="text-xs text-ink-muted mt-0.5">
                  Ditampilkan pada kop bukti peminjaman dan kartu anggota.
                </p>
              </div>
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  value={namaPerpustakaan}
                  onChange={(e) => setNamaPerpustakaan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-md border border-line bg-white text-sm focus:border-ink min-h-[42px]"
                  required
                />
              </div>
            </div>

            {/* Lama Pinjam Hari */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="font-semibold text-sm text-ink block">
                  Durasi Standar Peminjaman (Hari)
                </label>
                <p className="text-xs text-ink-muted mt-0.5">
                  Jumlah hari kalender sebelum buku berstatus jatuh tempo (`lama_pinjam_hari`).
                </p>
              </div>
              <div className="w-full sm:w-48">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={lamaPinjamHari}
                  onChange={(e) => setLamaPinjamHari(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-md border border-line bg-white font-mono text-sm focus:border-ink min-h-[42px]"
                  required
                />
              </div>
            </div>

            {/* Maksimal Buku Per Anggota */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="font-semibold text-sm text-ink block">
                  Kuota Maksimal Buku per Anggota
                </label>
                <p className="text-xs text-ink-muted mt-0.5">
                  Batas jumlah eksemplar buku yang boleh dipinjam bersamaan oleh satu siswa (`maks_buku_per_anggota`).
                </p>
              </div>
              <div className="w-full sm:w-48">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maksBukuPerAnggota}
                  onChange={(e) => setMaksBukuPerAnggota(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-md border border-line bg-white font-mono text-sm focus:border-ink min-h-[42px]"
                  required
                />
              </div>
            </div>

            {/* Denda Per Hari */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="font-semibold text-sm text-ink block">
                  Tarif Denda Keterlambatan per Hari (Rp)
                </label>
                <p className="text-xs text-ink-muted mt-0.5">
                  Isi 0 jika perpustakaan tidak menerapkan denda uang (`denda_per_hari_rp`).
                </p>
              </div>
              <div className="w-full sm:w-48">
                <input
                  type="number"
                  min={0}
                  max={100000}
                  step={500}
                  value={dendaPerHariRp}
                  onChange={(e) => setDendaPerHariRp(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-md border border-line bg-white font-mono text-sm focus:border-ink min-h-[42px]"
                  required
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-line flex justify-end gap-3">
          <button
            type="button"
            onClick={muatPengaturan}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-line bg-white hover:bg-paper-sunken text-ink text-xs font-semibold min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Muat Ulang</span>
          </button>
          <button
            type="submit"
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-ink text-paper hover:bg-ink/90 text-xs font-semibold min-h-[44px] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Menyimpan..." : "Simpan Pengaturan"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
