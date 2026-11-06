"use client";

/**
 * Bilik Baca - Halaman Manajemen Anggota Perpustakaan
 * Mendukung Pencarian Real-time, Filter Status, Paginasi (25 baris/halaman),
 * Tambah Manual, Edit Anggota, Impor XLSX Dua Langkah, Cetak Kartu QR, dan Sinkronisasi Netri SMS.
 */

import { useState, useEffect, useMemo } from "react";
import {
  UserPlus,
  FileSpreadsheet,
  QrCode,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Upload,
  ArrowRight,
  CloudDownload,
  Edit3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const BARIS_PER_HALAMAN = 25;

export default function AdminAnggotaPage() {
  const [daftarAnggota, setDaftarAnggota] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Paginasi
  const [kataKunci, setKataKunci] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | "aktif" | "nonaktif">("semua");
  const [filterJenis, setFilterJenis] = useState<"semua" | "siswa" | "guru" | "staf">("semua");
  const [halaman, setHalaman] = useState(1);

  // Modal Tambah Anggota Manual
  const [modalTambahBuka, setModalTambahBuka] = useState(false);
  const [formNis, setFormNis] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formJenis, setFormJenis] = useState<"siswa" | "guru" | "staf">("siswa");
  const [formKelas, setFormKelas] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Modal Edit Anggota
  const [modalEditBuka, setModalEditBuka] = useState(false);
  const [editId, setEditId] = useState("");
  const [editNis, setEditNis] = useState("");
  const [editNama, setEditNama] = useState("");
  const [editJenis, setEditJenis] = useState<"siswa" | "guru" | "staf">("siswa");
  const [editKelas, setEditKelas] = useState("");
  const [editStatus, setEditStatus] = useState<"aktif" | "nonaktif" | "ditangguhkan">("aktif");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Modal Impor Excel/CSV
  const [modalImporBuka, setModalImporBuka] = useState(false);
  const [berkasImpor, setBerkasImpor] = useState<File | null>(null);
  const [loadingPratinjau, setLoadingPratinjau] = useState(false);
  const [dataPratinjau, setDataPratinjau] = useState<any | null>(null);
  const [isSavingImpor, setIsSavingImpor] = useState(false);

  // Modal Cetak Kartu
  const [modalCetakBuka, setModalCetakBuka] = useState(false);
  const [selectedAnggota, setSelectedAnggota] = useState<any | null>(null);

  // State Sinkronisasi Netri SMS (Supabase)
  const [isSyncingNetri, setIsSyncingNetri] = useState(false);
  const [hasilSyncModal, setHasilSyncModal] = useState<any | null>(null);

  const [toast, setToast] = useState<{ tipe: "sukses" | "error"; pesan: string } | null>(null);

  const tampilkanToast = (pesan: string, tipe: "sukses" | "error") => {
    setToast({ pesan, tipe });
    setTimeout(() => setToast(null), 4000);
  };

  const muatData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/anggota");
      if (res.status === 401) {
        window.location.href = "/admin/login?alihkan=/admin/anggota";
        return;
      }
      const json = await res.json();
      if (json.sukses) setDaftarAnggota(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    muatData();
  }, []);

  // Reset ke halaman 1 setiap kali filter berubah
  useEffect(() => {
    setHalaman(1);
  }, [kataKunci, filterStatus, filterJenis]);

  // Data anggota yang sudah difilter
  const anggotaTerfilter = useMemo(() => {
    return daftarAnggota.filter((m) => {
      if (filterStatus !== "semua" && m.status !== filterStatus) return false;
      if (filterJenis !== "semua" && m.jenis !== filterJenis) return false;
      if (kataKunci.trim()) {
        const q = kataKunci.toLowerCase();
        const cocokNama = m.nama?.toLowerCase().includes(q);
        const cocokNis = m.nomorInduk?.toLowerCase().includes(q);
        const cocokKelas = (m.kelas || "").toLowerCase().includes(q);
        return cocokNama || cocokNis || cocokKelas;
      }
      return true;
    });
  }, [daftarAnggota, kataKunci, filterStatus, filterJenis]);

  const totalHalaman = Math.max(1, Math.ceil(anggotaTerfilter.length / BARIS_PER_HALAMAN));
  const anggotaHalamanIni = useMemo(() => {
    const mulai = (halaman - 1) * BARIS_PER_HALAMAN;
    return anggotaTerfilter.slice(mulai, mulai + BARIS_PER_HALAMAN);
  }, [anggotaTerfilter, halaman]);

  // Simpan Anggota Baru Manual
  const handleSimpanManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNis.trim() || !formNama.trim() || isSubmittingManual) return;

    setIsSubmittingManual(true);
    try {
      const res = await fetch("/api/v1/admin/anggota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomorInduk: formNis.trim(),
          nama: formNama.trim(),
          jenis: formJenis,
          kelas: formKelas.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal menambahkan anggota");
      }

      tampilkanToast(json.pesan, "sukses");
      setModalTambahBuka(false);
      muatData();

      setFormNis("");
      setFormNama("");
      setFormKelas("");
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Buka Modal Edit Anggota
  const bukaModalEdit = (m: any) => {
    setEditId(m.id);
    setEditNis(m.nomorInduk || "");
    setEditNama(m.nama || "");
    setEditJenis(m.jenis || "siswa");
    setEditKelas(m.kelas || "");
    setEditStatus(m.status || "aktif");
    setModalEditBuka(true);
  };

  // Simpan Edit Anggota
  const handleSimpanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editNis.trim() || !editNama.trim() || isSubmittingEdit) return;

    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/v1/admin/anggota/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomorInduk: editNis.trim(),
          nama: editNama.trim(),
          jenis: editJenis,
          kelas: editKelas.trim() || null,
          status: editStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal memperbarui anggota");
      }

      tampilkanToast(json.pesan, "sukses");
      setModalEditBuka(false);
      muatData();
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Upload & Pratinjau Excel
  const handleProsesPratinjau = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!berkasImpor || loadingPratinjau) return;

    setLoadingPratinjau(true);
    try {
      const formData = new FormData();
      formData.append("berkas", berkasImpor);

      const res = await fetch("/api/v1/admin/anggota/impor/pratinjau", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal membaca berkas Excel");
      }

      setDataPratinjau(json.data);
      tampilkanToast("Pratinjau impor berhasil dimuat.", "sukses");
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setLoadingPratinjau(false);
    }
  };

  // Commit Simpan Impor Permanen
  const handleCommitImpor = async () => {
    if (!dataPratinjau || isSavingImpor) return;

    setIsSavingImpor(true);
    try {
      const res = await fetch(`/api/v1/admin/anggota/impor/${dataPratinjau.batchId}/simpan`, {
        method: "POST",
      });

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal menyimpan commit impor");
      }

      tampilkanToast(json.pesan, "sukses");
      setModalImporBuka(false);
      setDataPratinjau(null);
      setBerkasImpor(null);
      muatData();
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setIsSavingImpor(false);
    }
  };

  // Sinkronisasi Langsung dari Netri SMS (Supabase Cloud)
  const handleSyncNetri = async () => {
    if (isSyncingNetri) return;

    setIsSyncingNetri(true);
    try {
      const res = await fetch("/api/v1/admin/anggota/sync-netri", {
        method: "POST",
      });

      if (res.status === 401) {
        tampilkanToast("Sesi telah berakhir atau belum masuk. Mengalihkan ke login...", "error");
        setTimeout(() => {
          window.location.href = "/admin/login?alihkan=/admin/anggota";
        }, 1200);
        return;
      }

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal melakukan sinkronisasi dengan Netri SMS");
      }

      setHasilSyncModal(json.data);
      tampilkanToast(json.pesan, "sukses");
      muatData();
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setIsSyncingNetri(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px]">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-lg shadow-lg border flex items-center gap-3 text-sm font-medium animate-fade-in print:hidden ${
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

      {/* Header Halaman Anggota */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4 print:hidden">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Data Anggota Siswa & Guru</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Kelola master data peminjam perpustakaan, cetak kartu QR anggota, dan sinkronisasi Netri SMS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncNetri}
            disabled={isSyncingNetri}
            title="Tarik & sinkronkan data siswa dari Supabase Netri SMS"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold transition-colors min-h-[44px] disabled:opacity-50"
          >
            <CloudDownload
              className={`w-4 h-4 text-group-pelajaran ${isSyncingNetri ? "animate-bounce" : ""}`}
            />
            <span>{isSyncingNetri ? "Menyinkronkan..." : "Sinkronisasi Netri SMS"}</span>
          </button>

          <button
            onClick={() => {
              setDataPratinjau(null);
              setBerkasImpor(null);
              setModalImporBuka(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold transition-colors min-h-[44px]"
          >
            <FileSpreadsheet className="w-4 h-4 text-status-tersedia" />
            <span>Impor XLSX / CSV</span>
          </button>

          <button
            onClick={() => setModalTambahBuka(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-ink text-paper text-xs font-semibold hover:bg-ink/90 transition-colors min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Anggota</span>
          </button>
        </div>
      </div>

      {/* Tabel Anggota + Pencarian & Filter */}
      <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden print:hidden">
        <div className="px-6 py-4 border-b border-line flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-serif font-bold text-base text-ink">Daftar Anggota Terdaftar</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-paper-sunken font-mono text-xs text-ink-muted">
              {anggotaTerfilter.length} dari {daftarAnggota.length} Anggota
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Input Pencarian */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={kataKunci}
                onChange={(e) => setKataKunci(e.target.value)}
                placeholder="Cari NIS, Nama, atau Kelas..."
                className="pl-8 pr-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[38px] w-64"
              />
            </div>

            {/* Filter Jenis */}
            <select
              value={filterJenis}
              onChange={(e: any) => setFilterJenis(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[38px]"
            >
              <option value="semua">Semua Jenis</option>
              <option value="siswa">Siswa</option>
              <option value="guru">Guru</option>
              <option value="staf">Staf</option>
            </select>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[38px]"
            >
              <option value="semua">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif / Lulus</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-ink-muted font-mono">
            Memuat data anggota perpustakaan...
          </div>
        ) : anggotaTerfilter.length === 0 ? (
          <div className="p-8 text-center text-ink-muted text-sm">
            Tidak ada anggota yang sesuai dengan pencarian/filter.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper-sunken/60 font-mono uppercase text-ink-muted border-b border-line">
                  <tr>
                    <th className="py-3 px-4">Nomor Induk</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi & Kartu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {anggotaHalamanIni.map((m) => (
                    <tr key={m.id} className="hover:bg-paper-sunken/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-ink">{m.nomorInduk}</td>
                      <td className="py-3 px-4 font-medium text-ink">{m.nama}</td>
                      <td className="py-3 px-4 capitalize font-mono text-ink-muted">{m.jenis}</td>
                      <td className="py-3 px-4 font-mono">{m.kelas || "Umum"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                            m.status === "aktif"
                              ? "bg-status-tersedia/10 text-status-tersedia"
                              : "bg-danger/10 text-danger"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => bukaModalEdit(m)}
                            className="px-2.5 py-1.5 rounded border border-line hover:bg-paper-sunken text-xs font-medium inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAnggota(m);
                              setModalCetakBuka(true);
                            }}
                            className="px-3 py-1.5 rounded border border-line hover:bg-paper-sunken text-xs font-mono font-semibold inline-flex items-center gap-1.5"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Kartu QR</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kontrol Paginasi */}
            <div className="px-6 py-3.5 border-t border-line flex items-center justify-between text-xs bg-paper-sunken/20">
              <span className="font-mono text-ink-muted">
                Menampilkan {(halaman - 1) * BARIS_PER_HALAMAN + 1}–
                {Math.min(halaman * BARIS_PER_HALAMAN, anggotaTerfilter.length)} dari{" "}
                {anggotaTerfilter.length} anggota
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHalaman((p) => Math.max(1, p - 1))}
                  disabled={halaman <= 1}
                  className="px-3 py-1.5 rounded border border-line bg-white hover:bg-paper-sunken disabled:opacity-40 inline-flex items-center gap-1 font-medium"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>
                <span className="font-mono px-2">
                  Hal {halaman} / {totalHalaman}
                </span>
                <button
                  onClick={() => setHalaman((p) => Math.min(totalHalaman, p + 1))}
                  disabled={halaman >= totalHalaman}
                  className="px-3 py-1.5 rounded border border-line bg-white hover:bg-paper-sunken disabled:opacity-40 inline-flex items-center gap-1 font-medium"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FORM TAMBAH ANGGOTA MANUAL                                      */}
      {/* ========================================================================= */}
      {modalTambahBuka && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-serif font-bold text-lg text-ink">Tambah Anggota Manual</h3>
              <button
                onClick={() => setModalTambahBuka(false)}
                className="p-1 rounded text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimpanManual} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  Nomor Induk (NIS / NIP) *
                </label>
                <input
                  type="text"
                  required
                  value={formNis}
                  onChange={(e) => setFormNis(e.target.value)}
                  placeholder="Contoh: 202407010"
                  className="w-full px-3 py-2 rounded border border-line font-mono text-sm focus:border-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Muhammad Rafif"
                  className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Jenis Anggota</label>
                <select
                  value={formJenis}
                  onChange={(e: any) => setFormJenis(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                >
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="staf">Staf Perpustakaan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Kelas / Ruang</label>
                <input
                  type="text"
                  value={formKelas}
                  onChange={(e) => setFormKelas(e.target.value)}
                  placeholder="Contoh: VII-B atau Guru IPA"
                  className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink font-mono"
                />
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalTambahBuka(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 disabled:opacity-50"
                >
                  {isSubmittingManual ? "Menyimpan..." : "Simpan Anggota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1B: FORM EDIT ANGGOTA                                              */}
      {/* ========================================================================= */}
      {modalEditBuka && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-serif font-bold text-lg text-ink">Edit Data Anggota</h3>
              <button
                onClick={() => setModalEditBuka(false)}
                className="p-1 rounded text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimpanEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  Nomor Induk (NIS / NIP) *
                </label>
                <input
                  type="text"
                  required
                  value={editNis}
                  onChange={(e) => setEditNis(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-line font-mono text-sm focus:border-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Jenis Anggota</label>
                  <select
                    value={editJenis}
                    onChange={(e: any) => setEditJenis(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                  >
                    <option value="siswa">Siswa</option>
                    <option value="guru">Guru</option>
                    <option value="staf">Staf</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Status Keanggotaan</label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif / Lulus</option>
                    <option value="ditangguhkan">Ditangguhkan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Kelas / Ruang</label>
                <input
                  type="text"
                  value={editKelas}
                  onChange={(e) => setEditKelas(e.target.value)}
                  placeholder="Contoh: VIII-A"
                  className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink font-mono"
                />
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalEditBuka(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 disabled:opacity-50"
                >
                  {isSubmittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: IMPOR XLSX DUA LANGKAH (PRATINJAU -> COMMIT)                     */}
      {/* ========================================================================= */}
      {modalImporBuka && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-ink">Impor Anggota dari Excel (.xlsx)</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Langkah 1: Unggah berkas untuk melihat pratinjau validasi data.
                </p>
              </div>
              <button
                onClick={() => setModalImporBuka(false)}
                className="p-1 rounded text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!dataPratinjau ? (
              <form onSubmit={handleProsesPratinjau} className="space-y-4">
                <div className="border-2 border-dashed border-line rounded-xl p-8 text-center bg-paper/40">
                  <Upload className="w-10 h-10 text-ink-muted mx-auto mb-2" />
                  <p className="text-xs text-ink-muted mb-3">
                    Format kolom: <strong>nomor_induk</strong>, <strong>nama</strong>, <strong>jenis</strong>, <strong>kelas</strong>
                  </p>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setBerkasImpor(e.target.files?.[0] || null)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalImporBuka(false)}
                    className="px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!berkasImpor || loadingPratinjau}
                    className="px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span>{loadingPratinjau ? "Menganalisis Berkas..." : "Tampilkan Pratinjau"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              /* Pratinjau Hasil Validasi */
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-paper-sunken">
                    <span className="font-mono text-xs text-ink-muted block">Total Baris</span>
                    <strong className="font-mono text-xl text-ink">{dataPratinjau.totalBaris}</strong>
                  </div>
                  <div className="p-3 rounded-lg bg-status-tersedia/10 text-status-tersedia">
                    <span className="font-mono text-xs block">Data Valid</span>
                    <strong className="font-mono text-xl">{dataPratinjau.barisValid}</strong>
                  </div>
                  <div className="p-3 rounded-lg bg-danger/10 text-danger">
                    <span className="font-mono text-xs block">Duplikat/Error</span>
                    <strong className="font-mono text-xl">{dataPratinjau.barisBermasalah}</strong>
                  </div>
                </div>

                {dataPratinjau.daftarError.length > 0 && (
                  <div className="border border-line rounded-lg p-3 bg-paper-sunken/40 space-y-2 text-xs">
                    <span className="font-semibold text-danger block">Catatan Baris Bermasalah:</span>
                    <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-[11px]">
                      {dataPratinjau.daftarError.map((err: any, idx: number) => (
                        <p key={idx}>
                          Baris {err.baris}: {err.alasan}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-line">
                  <button
                    onClick={() => setDataPratinjau(null)}
                    className="px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink"
                  >
                    Unggah Ulang
                  </button>
                  <button
                    onClick={handleCommitImpor}
                    disabled={dataPratinjau.barisValid === 0 || isSavingImpor}
                    className="px-6 py-2.5 rounded-lg bg-status-tersedia text-white text-xs font-semibold hover:brightness-105 disabled:opacity-50"
                  >
                    {isSavingImpor
                      ? "Menyimpan ke Basis Data..."
                      : `Simpan ${dataPratinjau.barisValid} Anggota`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CETAK KARTU ANGGOTA BER-QR                                      */}
      {/* ========================================================================= */}
      {modalCetakBuka && selectedAnggota && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-line pb-3 print:hidden">
              <h3 className="font-serif font-bold text-base text-ink">Kartu Anggota Perpustakaan</h3>
              <button
                onClick={() => setModalCetakBuka(false)}
                className="p-1 rounded text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Kartu Fisik Preview */}
            <div className="border border-line rounded-xl p-6 bg-paper shadow-sm flex flex-col items-center space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-ink text-paper flex items-center justify-center font-serif font-bold text-sm">
                  B
                </div>
                <span className="font-serif font-bold text-base text-ink">Bilik Baca</span>
              </div>

              {/* QR Image dari API */}
              <div className="p-2 bg-white rounded-lg border border-line">
                <img
                  src={`/api/v1/admin/qr?tipe=anggota&id=${selectedAnggota.id}`}
                  alt="QR Kartu Siswa"
                  className="w-40 h-40 object-contain"
                />
              </div>

              <div>
                <h4 className="font-serif font-bold text-base text-ink">{selectedAnggota.nama}</h4>
                <p className="font-mono text-xs text-ink-muted mt-0.5">
                  NIS: {selectedAnggota.nomorInduk} • Kelas: {selectedAnggota.kelas || "Umum"}
                </p>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 print:hidden"
            >
              Cetak Kartu Sekarang
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: LAPORAN HASIL SINKRONISASI NETRI SMS                             */}
      {/* ========================================================================= */}
      {hasilSyncModal && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-status-tersedia/10 text-status-tersedia flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-serif font-bold text-xl text-ink">Sinkronisasi Netri SMS Berhasil</h3>
              <p className="text-xs text-ink-muted mt-1">
                Data siswa dari cloud Supabase telah disinkronkan ke server lokal perpustakaan.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 py-2">
              <div className="p-3 rounded-lg bg-paper-sunken">
                <span className="font-mono text-[11px] text-ink-muted block">Siswa Baru</span>
                <strong className="font-mono text-xl text-ink">{hasilSyncModal.baru}</strong>
              </div>
              <div className="p-3 rounded-lg bg-status-tersedia/10 text-status-tersedia">
                <span className="font-mono text-[11px] block">Diperbarui</span>
                <strong className="font-mono text-xl">{hasilSyncModal.diperbarui}</strong>
              </div>
              <div className="p-3 rounded-lg bg-danger/10 text-danger">
                <span className="font-mono text-[11px] block">Nonaktif/Lulus</span>
                <strong className="font-mono text-xl">{hasilSyncModal.dinonaktifkan}</strong>
              </div>
            </div>

            <p className="text-xs text-ink-muted font-mono">
              Total {hasilSyncModal.totalDitarik} data siswa diproses dari Netri SMS.
            </p>

            <button
              onClick={() => setHasilSyncModal(null)}
              className="w-full py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 min-h-[44px]"
            >
              Selesai & Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
