"use client";

import { useState, useEffect } from "react";
import { Plus, Globe, Search, BookMarked, QrCode, X, CheckCircle2, AlertCircle } from "lucide-react";
import { BookSpineTick } from "@/components/ui/BookSpineTick";

export default function AdminBukuPage() {
  const [daftarBuku, setDaftarBuku] = useState<any[]>([]);
  const [daftarKategori, setDaftarKategori] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Cari Online
  const [modalOnlineBuka, setModalOnlineBuka] = useState(false);
  const [queryOnline, setQueryOnline] = useState("");
  const [hasilOnline, setHasilOnline] = useState<any[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);

  // Modal Tambah / Form Buku
  const [modalFormBuka, setModalFormBuka] = useState(false);
  const [formJudul, setFormJudul] = useState("");
  const [formPenulis, setFormPenulis] = useState("");
  const [formPenerbit, setFormPenerbit] = useState("");
  const [formTahun, setFormTahun] = useState<number | "">("");
  const [formIsbn, setFormIsbn] = useState("");
  const [formKategoriId, setFormKategoriId] = useState("");
  const [formSinopsis, setFormSinopsis] = useState("");
  const [formJumlahEksemplar, setFormJumlahEksemplar] = useState(3);
  const [formLokasiRak, setFormLokasiRak] = useState("");
  const [formSumber, setFormSumber] = useState<"manual" | "google_books" | "open_library">("manual");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Cetak Label QR
  const [modalQrBuka, setModalQrBuka] = useState(false);
  const [selectedEksemplar, setSelectedEksemplar] = useState<{ id: string; judul: string; kode: string } | null>(null);

  const [toast, setToast] = useState<{ tipe: "sukses" | "error"; pesan: string } | null>(null);

  const tampilkanToast = (pesan: string, tipe: "sukses" | "error") => {
    setToast({ pesan, tipe });
    setTimeout(() => setToast(null), 4000);
  };

  const muatData = async () => {
    try {
      setLoading(true);
      const [resBuku, resKat] = await Promise.all([
        fetch("/api/v1/admin/buku"),
        fetch("/api/v1/admin/kategori"),
      ]);
      const jsonBuku = await resBuku.json();
      const jsonKat = await resKat.json();

      if (jsonBuku.sukses) setDaftarBuku(jsonBuku.data);
      if (jsonKat.sukses) {
        setDaftarKategori(jsonKat.data);
        if (jsonKat.data.length > 0 && !formKategoriId) {
          setFormKategoriId(jsonKat.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    muatData();
  }, []);

  // Handler Cari Online (Google Books + Open Library)
  const handleCariOnline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryOnline.trim() || loadingOnline) return;

    setLoadingOnline(true);
    try {
      const res = await fetch(`/api/v1/admin/buku-eksternal?q=${encodeURIComponent(queryOnline.trim())}`);
      const json = await res.json();
      if (json.sukses && Array.isArray(json.data)) {
        setHasilOnline(json.data);
      } else {
        setHasilOnline([]);
        tampilkanToast(json.pesan || "Tidak ada hasil ditemukan", "error");
      }
    } catch {
      tampilkanToast("Gagal mencari buku online", "error");
    } finally {
      setLoadingOnline(false);
    }
  };

  // Handler Klik Tombol '+' pada Hasil Pencarian Online
  const handlePilihBukuOnline = (item: any) => {
    setFormJudul(item.judul);
    setFormPenulis(item.penulis);
    setFormPenerbit(item.penerbit);
    setFormTahun(item.tahunTerbit || "");
    setFormIsbn(item.isbn || "");
    setFormSinopsis(item.sinopsis || "");
    setFormSumber(item.sumber);
    setFormJumlahEksemplar(3);
    setFormLokasiRak("R-01");

    setModalOnlineBuka(false);
    setModalFormBuka(true);
    tampilkanToast(`Data '${item.judul}' disalin ke formulir buku baru.`, "sukses");
  };

  // Simpan Buku Baru ke Database
  const handleSimpanBuku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim() || !formPenulis.trim() || !formKategoriId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/admin/buku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judul: formJudul.trim(),
          penulis: formPenulis.trim(),
          penerbit: formPenerbit.trim() || undefined,
          tahunTerbit: formTahun ? Number(formTahun) : undefined,
          isbn: formIsbn.trim() || undefined,
          kategoriId: formKategoriId,
          sinopsis: formSinopsis.trim() || undefined,
          jumlahEksemplar: Number(formJumlahEksemplar),
          lokasiRak: formLokasiRak.trim() || undefined,
          sumber: formSumber,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal menyimpan buku");
      }

      tampilkanToast(json.pesan, "sukses");
      setModalFormBuka(false);
      muatData();

      // Reset form
      setFormJudul("");
      setFormPenulis("");
      setFormPenerbit("");
      setFormTahun("");
      setFormIsbn("");
      setFormSinopsis("");
      setFormJumlahEksemplar(3);
      setFormSumber("manual");
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px]">
      {/* Toast Alert */}
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

      {/* Header Halaman Buku */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Katalog & Eksemplar Buku</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Kelola judul koleksi perpustakaan, buat eksemplar fisik otomatis, dan cetak label QR.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalOnlineBuka(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold transition-colors min-h-[44px]"
          >
            <Globe className="w-4 h-4 text-ink-muted" />
            <span>Cari Buku Online (+)</span>
          </button>

          <button
            onClick={() => {
              setFormSumber("manual");
              setModalFormBuka(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-ink text-paper text-xs font-semibold hover:bg-ink/90 transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Buku Manual</span>
          </button>
        </div>
      </div>

      {/* Tabel Koleksi Buku */}
      <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-serif font-bold text-base text-ink">Daftar Koleksi Terdaftar</h2>
          <span className="font-mono text-xs text-ink-muted">{daftarBuku.length} Judul Buku</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-ink-muted font-mono">
            Memuat data koleksi buku...
          </div>
        ) : daftarBuku.length === 0 ? (
          <div className="p-8 text-center text-ink-muted text-sm">
            Belum ada buku terdaftar. Klik Cari Online (+) atau Tambah Manual.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-sunken/60 font-mono uppercase text-ink-muted border-b border-line">
                <tr>
                  <th className="py-3 px-4">Judul & Penulis</th>
                  <th className="py-3 px-4">Kelompok</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Rak</th>
                  <th className="py-3 px-4">Ketersediaan</th>
                  <th className="py-3 px-4 text-center">Eksemplar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {daftarBuku.map((item) => (
                  <tr key={item.id} className="hover:bg-paper-sunken/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-serif font-bold text-sm text-ink block">{item.judul}</span>
                      <span className="text-ink-muted text-xs block">{item.penulis}</span>
                      {item.isbn && (
                        <span className="font-mono text-[10px] text-ink-muted">ISBN: {item.isbn}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase text-white font-semibold ${
                          item.kelompok === "pelajaran" ? "bg-group-pelajaran" : "bg-group-hiburan"
                        }`}
                      >
                        {item.kelompok}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-ink">{item.kategoriNama}</td>
                    <td className="py-3.5 px-4 font-mono">{item.lokasiRak || "-"}</td>
                    <td className="py-3.5 px-4">
                      <BookSpineTick
                        total={Number(item.totalEksemplar || 0)}
                        tersedia={Number(item.tersediaEksemplar || 0)}
                        showText={true}
                      />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono text-xs font-bold text-ink">
                        {item.totalEksemplar} Unit
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CARI BUKU ONLINE & TOMBOL (+)                                   */}
      {/* ========================================================================= */}
      {modalOnlineBuka && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-ink">Cari Buku Online</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Tarik otomatis judul & sinopsis dari Google Books dan Open Library.
                </p>
              </div>
              <button
                onClick={() => setModalOnlineBuka(false)}
                className="p-1 rounded text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCariOnline} className="flex gap-2 mb-4">
              <input
                type="text"
                value={queryOnline}
                onChange={(e) => setQueryOnline(e.target.value)}
                placeholder="Ketik judul buku, nama penulis, atau ISBN (misal: Laskar Pelangi)..."
                className="flex-1 px-4 py-2.5 rounded-lg border border-line text-sm focus:border-ink"
              />
              <button
                type="submit"
                disabled={loadingOnline || !queryOnline.trim()}
                className="px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 disabled:opacity-50"
              >
                {loadingOnline ? "Mencari..." : "Cari Online"}
              </button>
            </form>

            <div className="flex-1 overflow-y-auto divide-y divide-line/60">
              {hasilOnline.length === 0 ? (
                <div className="py-12 text-center text-xs text-ink-muted">
                  Ketik kata kunci untuk mencari di Google Books & Open Library.
                </div>
              ) : (
                hasilOnline.map((item, idx) => (
                  <div key={idx} className="py-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-1 max-w-xl">
                      <h4 className="font-serif font-bold text-sm text-ink">{item.judul}</h4>
                      <p className="text-xs text-ink-muted">
                        Penulis: {item.penulis} • Penerbit: {item.penerbit} ({item.tahunTerbit || "-"})
                      </p>
                      {item.sinopsis && (
                        <p className="text-xs text-ink-muted/80 line-clamp-2">{item.sinopsis}</p>
                      )}
                    </div>
                    {/* Tombol '+' Pilihan Manual */}
                    <button
                      onClick={() => handlePilihBukuOnline(item)}
                      title="Pilih buku ini dan tambahkan ke katalog"
                      className="px-3 py-2 rounded-lg bg-group-hiburan text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:brightness-105 shrink-0 min-h-[38px]"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Pilih</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FORM TAMBAH BUKU & EKSEMPLAR OTOMATIS                           */}
      {/* ========================================================================= */}
      {modalFormBuka && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-ink">Tambah Buku ke Katalog</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Isi data buku dan tentukan jumlah eksemplar fisik yang dicetak.
                </p>
              </div>
              <button
                onClick={() => setModalFormBuka(false)}
                className="p-1 rounded text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimpanBuku} className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-ink-muted mb-1">
                    Judul Buku *
                  </label>
                  <input
                    type="text"
                    required
                    value={formJudul}
                    onChange={(e) => setFormJudul(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">
                    Nama Penulis *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPenulis}
                    onChange={(e) => setFormPenulis(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">
                    Penerbit
                  </label>
                  <input
                    type="text"
                    value={formPenerbit}
                    onChange={(e) => setFormPenerbit(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">
                    Tahun Terbit
                  </label>
                  <input
                    type="number"
                    value={formTahun}
                    onChange={(e) => setFormTahun(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">ISBN</label>
                  <input
                    type="text"
                    value={formIsbn}
                    onChange={(e) => setFormIsbn(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">
                    Kategori Buku *
                  </label>
                  <select
                    value={formKategoriId}
                    onChange={(e) => setFormKategoriId(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                  >
                    {daftarKategori.map((k) => (
                      <option key={k.id} value={k.id}>
                        [{k.kelompok.toUpperCase()}] {k.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">
                    Jumlah Eksemplar Fisik *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={formJumlahEksemplar}
                    onChange={(e) => setFormJumlahEksemplar(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Lokasi Rak</label>
                  <input
                    type="text"
                    value={formLokasiRak}
                    onChange={(e) => setFormLokasiRak(e.target.value)}
                    placeholder="Contoh: R-01-A"
                    className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-ink-muted mb-1">Sinopsis</label>
                  <textarea
                    rows={3}
                    value={formSinopsis}
                    onChange={(e) => setFormSinopsis(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-line flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalFormBuka(false)}
                  className="px-4 py-2 rounded text-xs font-medium text-ink-muted hover:text-ink"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan ke Database..." : "Simpan Buku & Eksemplar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
