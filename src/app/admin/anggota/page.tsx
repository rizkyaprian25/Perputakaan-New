"use client";

/**
 * Bilik Baca - Halaman Manajemen Anggota Perpustakaan
 * Mendukung Pencarian Real-time, Filter Status & Kelas, Paginasi (25 baris/halaman),
 * Tambah Manual, Edit Anggota, Riwayat Siswa, Cetak Kartu Individual & Cetak Kartu Massal A4 per Kelas,
 * serta Sinkronisasi Netri SMS Supabase.
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
  Printer,
  History,
  BookOpen,
  Calendar,
  Clock,
  Layers,
  ExternalLink,
} from "lucide-react";

const BARIS_PER_HALAMAN = 25;

export default function AdminAnggotaPage() {
  const [daftarAnggota, setDaftarAnggota] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Paginasi
  const [kataKunci, setKataKunci] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | "aktif" | "nonaktif">("semua");
  const [filterJenis, setFilterJenis] = useState<"semua" | "siswa" | "guru" | "staf">("semua");
  const [filterKelas, setFilterKelas] = useState<string>("semua");
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

  // Modal Cetak Kartu Tunggal
  const [modalCetakBuka, setModalCetakBuka] = useState(false);
  const [selectedAnggota, setSelectedAnggota] = useState<any | null>(null);

  // Modal Cetak Massal A4
  const [modalCetakMassalBuka, setModalCetakMassalBuka] = useState(false);
  const [kelasDipilihCetak, setKelasDipilihCetak] = useState<string>("semua");

  // Modal Riwayat Aktivitas Siswa
  const [modalRiwayatBuka, setModalRiwayatBuka] = useState(false);
  const [dataRiwayat, setDataRiwayat] = useState<any | null>(null);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);

  // Modal Impor Excel/CSV
  const [modalImporBuka, setModalImporBuka] = useState(false);
  const [berkasImpor, setBerkasImpor] = useState<File | null>(null);
  const [loadingPratinjau, setLoadingPratinjau] = useState(false);
  const [dataPratinjau, setDataPratinjau] = useState<any | null>(null);
  const [isSavingImpor, setIsSavingImpor] = useState(false);

  // State Sinkronisasi Netri SMS (Supabase)
  const [isSyncingNetri, setIsSyncingNetri] = useState(false);
  const [hasilSyncModal, setHasilSyncModal] = useState<any | null>(null);

  const [toast, setToast] = useState<{ tipe: "sukses" | "error"; pesan: string } | null>(null);

  const tampilkanToast = (pesan: string, tipe: "sukses" | "error") => {
    setToast({ pesan, tipe });
    setTimeout(() => setToast(null), 4000);
  };

  // Fungsi Cetak Bersih Kartu Anggota: Menghilangkan 100% Elemen Web Latar Belakang
  const cetakKartuTerisolasi = () => {
    document.body.setAttribute("data-print-mode", "kartu");
    const bersihkanSetelahCetak = () => {
      document.body.removeAttribute("data-print-mode");
      window.removeEventListener("afterprint", bersihkanSetelahCetak);
    };
    window.addEventListener("afterprint", bersihkanSetelahCetak);
    window.print();
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

  // Ekstrak daftar kelas unik dari database
  const daftarKelasUnik = useMemo(() => {
    const setKelas = new Set<string>();
    for (const m of daftarAnggota) {
      if (m.kelas && m.kelas.trim()) {
        setKelas.add(m.kelas.trim());
      }
    }
    return Array.from(setKelas).sort();
  }, [daftarAnggota]);

  // Reset ke halaman 1 setiap kali filter berubah
  useEffect(() => {
    setHalaman(1);
  }, [kataKunci, filterStatus, filterJenis, filterKelas]);

  // Data anggota yang sudah difilter
  const anggotaTerfilter = useMemo(() => {
    return daftarAnggota.filter((m) => {
      if (filterStatus !== "semua" && m.status !== filterStatus) return false;
      if (filterJenis !== "semua" && m.jenis !== filterJenis) return false;
      if (filterKelas !== "semua" && (m.kelas || "").trim() !== filterKelas) return false;
      if (kataKunci.trim()) {
        const q = kataKunci.toLowerCase();
        const cocokNama = m.nama?.toLowerCase().includes(q);
        const cocokNis = m.nomorInduk?.toLowerCase().includes(q);
        const cocokKelas = (m.kelas || "").toLowerCase().includes(q);
        return cocokNama || cocokNis || cocokKelas;
      }
      return true;
    });
  }, [daftarAnggota, kataKunci, filterStatus, filterJenis, filterKelas]);

  const totalHalaman = Math.max(1, Math.ceil(anggotaTerfilter.length / BARIS_PER_HALAMAN));
  const anggotaHalamanIni = useMemo(() => {
    const mulai = (halaman - 1) * BARIS_PER_HALAMAN;
    return anggotaTerfilter.slice(mulai, mulai + BARIS_PER_HALAMAN);
  }, [anggotaTerfilter, halaman]);

  // Siswa untuk cetak massal A4
  const anggotaUntukCetakMassal = useMemo(() => {
    if (kelasDipilihCetak === "semua") {
      return anggotaTerfilter.filter((m) => m.status === "aktif");
    }
    return daftarAnggota.filter(
      (m) => (m.kelas || "").trim() === kelasDipilihCetak && m.status === "aktif"
    );
  }, [daftarAnggota, anggotaTerfilter, kelasDipilihCetak]);

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

  // Buka Riwayat Aktivitas Siswa
  const bukaRiwayatSiswa = async (m: any) => {
    setLoadingRiwayat(true);
    setDataRiwayat(null);
    setModalRiwayatBuka(true);

    try {
      const res = await fetch(`/api/v1/admin/anggota/${m.id}/riwayat`);
      const json = await res.json();
      if (json.sukses) {
        setDataRiwayat(json.data);
      } else {
        tampilkanToast(json.pesan || "Gagal memuat riwayat", "error");
      }
    } catch {
      tampilkanToast("Terjadi kesalahan saat memuat riwayat", "error");
    } finally {
      setLoadingRiwayat(false);
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
    <div className="space-y-6 max-w-[1440px] anggota-view">
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4 print:hidden anggota-header">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Data Anggota Siswa & Guru</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Kelola master data peminjam perpustakaan, cetak kartu QR massal per kelas, dan sinkronisasi Netri SMS.
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

          <a
            href={`/admin/anggota/cetak-kartu?kelas=${
              filterKelas !== "semua" ? encodeURIComponent(filterKelas) : "semua"
            }`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold transition-colors min-h-[44px]"
          >
            <Printer className="w-4 h-4 text-status-tersedia" />
            <span>Cetak Kartu Massal (A4)</span>
          </a>

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
      <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden print:hidden anggota-table">
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
                className="pl-8 pr-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[38px] w-56"
              />
            </div>

            {/* Filter Kelas */}
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[38px] font-mono"
            >
              <option value="semua">Semua Kelas ({daftarKelasUnik.length})</option>
              {daftarKelasUnik.map((kls) => (
                <option key={kls} value={kls}>
                  Kelas {kls}
                </option>
              ))}
            </select>

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
                <thead className="bg-paper-sunken/60 font-sans text-[11px] font-semibold tracking-wider uppercase text-ink-muted border-b border-line">
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
                      <td className="py-3 px-4 capitalize font-sans text-ink-muted">{m.jenis}</td>
                      <td className="py-3 px-4 font-sans">{m.kelas || "Umum"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-sans uppercase font-bold ${
                            m.status === "aktif"
                              ? "bg-status-tersedia/10 text-status-tersedia"
                              : "bg-danger/10 text-danger"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => bukaRiwayatSiswa(m)}
                            title="Lihat riwayat peminjaman buku dan kunjungan kiosk"
                            className="p-1.5 rounded border border-line hover:bg-paper-sunken text-ink text-xs inline-flex items-center gap-1"
                          >
                            <History className="w-3.5 h-3.5 text-group-pelajaran" />
                            <span>Riwayat</span>
                          </button>

                          <button
                            onClick={() => bukaModalEdit(m)}
                            className="p-1.5 rounded border border-line hover:bg-paper-sunken text-xs font-medium inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <a
                            href={`/admin/anggota/cetak-kartu?id=${m.id}`}
                            title="Cetak Kartu Anggota QR Siswa Ini"
                            className="px-2.5 py-1.5 rounded border border-line hover:bg-paper-sunken text-xs font-sans font-semibold inline-flex items-center gap-1.5"
                          >
                            <QrCode className="w-3.5 h-3.5 text-status-tersedia" />
                            <span>Kartu QR</span>
                          </a>
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
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in print:hidden">
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
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in print:hidden">
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
      {/* MODAL 2: RIWAYAT AKTIVITAS ANGGOTA (SIRKULASI & PRESENSI KIOSK)           */}
      {/* ========================================================================= */}
      {modalRiwayatBuka && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-surface border border-line rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-ink">
                  Riwayat Aktivitas Perpustakaan
                </h3>
                {dataRiwayat && (
                  <p className="text-xs text-ink-muted mt-0.5">
                    {dataRiwayat.anggota.nama} • NIS: {dataRiwayat.anggota.nomorInduk} • Kelas: {dataRiwayat.anggota.kelas || "Umum"}
                  </p>
                )}
              </div>
              <button
                onClick={() => setModalRiwayatBuka(false)}
                className="p-1 rounded text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingRiwayat ? (
              <div className="py-12 text-center text-xs font-mono text-ink-muted">
                Memuat riwayat anggota...
              </div>
            ) : !dataRiwayat ? (
              <div className="py-8 text-center text-xs text-danger">
                Gagal memuat rincian riwayat aktivitas anggota.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Ringkasan Angka */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-status-dipinjam/10 text-status-dipinjam">
                    <span className="font-mono text-[11px] block">Sedang Dipinjam</span>
                    <strong className="font-mono text-xl">{dataRiwayat.statistik.totalDipinjam} Buku</strong>
                  </div>
                  <div className="p-3 rounded-lg bg-status-tersedia/10 text-status-tersedia">
                    <span className="font-mono text-[11px] block">Selesai Dikembalikan</span>
                    <strong className="font-mono text-xl">{dataRiwayat.statistik.totalSelesai} Buku</strong>
                  </div>
                  <div className="p-3 rounded-lg bg-paper-sunken text-ink">
                    <span className="font-mono text-[11px] text-ink-muted block">Presensi Kiosk</span>
                    <strong className="font-mono text-xl">{dataRiwayat.statistik.totalKunjungan} Kali</strong>
                  </div>
                </div>

                {/* Riwayat Peminjaman Buku */}
                <div className="space-y-2">
                  <h4 className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-group-hiburan" />
                    <span>Daftar Transaksi Peminjaman</span>
                  </h4>

                  <div className="border border-line rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-paper-sunken/60 font-mono uppercase text-ink-muted border-b border-line">
                        <tr>
                          <th className="py-2.5 px-3">Kode</th>
                          <th className="py-2.5 px-3">Judul Buku</th>
                          <th className="py-2.5 px-3">Tgl Pinjam</th>
                          <th className="py-2.5 px-3">Jatuh Tempo</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {dataRiwayat.riwayatPinjaman.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-ink-muted">
                              Siswa ini belum pernah meminjam buku.
                            </td>
                          </tr>
                        ) : (
                          dataRiwayat.riwayatPinjaman.map((p: any) => (
                            <tr key={p.id} className="hover:bg-paper-sunken/20">
                              <td className="py-2 px-3 font-mono font-bold text-ink">{p.kodeEksemplar}</td>
                              <td className="py-2 px-3 font-medium text-ink">{p.judulBuku}</td>
                              <td className="py-2 px-3 font-mono text-ink-muted">
                                {new Date(p.dipinjamPada).toLocaleDateString("id-ID")}
                              </td>
                              <td className="py-2 px-3 font-mono">
                                {new Date(p.jatuhTempo).toLocaleDateString("id-ID")}
                              </td>
                              <td className="py-2 px-3">
                                {p.isAktif ? (
                                  p.terlambat ? (
                                    <span className="px-2 py-0.5 rounded bg-danger/10 text-danger font-mono font-bold text-[10px]">
                                      Terlambat {p.selisihHari} hr
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-status-dipinjam/10 text-status-dipinjam font-mono font-bold text-[10px]">
                                      Aktif Dipinjam
                                    </span>
                                  )
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-status-tersedia/10 text-status-tersedia font-mono text-[10px]">
                                    Dikembalikan
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Riwayat Presensi Kiosk */}
                <div className="space-y-2">
                  <h4 className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-status-tersedia" />
                    <span>Presensi Kunjungan Kiosk Terakhir</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    {dataRiwayat.riwayatKunjungan.length === 0 ? (
                      <p className="col-span-4 text-center py-3 text-ink-muted">
                        Belum ada catatan presensi kunjungan kiosk.
                      </p>
                    ) : (
                      dataRiwayat.riwayatKunjungan.map((k: any) => (
                        <div key={k.id} className="p-2.5 rounded-lg border border-line bg-paper-sunken/40">
                          <span className="text-ink font-semibold block">{k.tanggal}</span>
                          <span className="text-[11px] text-ink-muted block">
                            Pukul {new Date(k.waktu).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-line flex justify-end">
              <button
                onClick={() => setModalRiwayatBuka(false)}
                className="px-5 py-2 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CETAK KARTU TUNGGAL (FORMAT ID-1 FISIK)                         */}
      {/* ========================================================================= */}
      {modalCetakBuka && selectedAnggota && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in print:p-0 print:bg-white print:static print:block">
          <div className="bg-surface border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 print:border-none print:shadow-none print:p-0 print:max-w-none">
            {/* Header Modal - Tersembunyi saat Cetak */}
            <div className="flex items-center justify-between border-b border-line pb-3 print:hidden">
              <h3 className="font-serif font-bold text-base text-ink">Pratinjau Kartu Anggota</h3>
              <button
                onClick={() => setModalCetakBuka(false)}
                className="p-1 rounded text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Kartu Fisik ID-1 Bersih (Hanya Ini yang Tercetak ke Kertas/PDF) */}
            <div className="flex justify-center print:block print:m-0 print:p-0">
              <div className="w-[340px] border-2 border-dashed border-ink/40 rounded-xl p-4 bg-white shadow-sm flex flex-col justify-between print:w-[85.6mm] print:h-[54mm] print:border print:border-dashed print:border-black print:rounded-none print:p-3 print:shadow-none print-card-unit break-inside-avoid">
                {/* Header Kartu Resmi */}
                <div className="flex items-center justify-between border-b border-black/80 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-black text-white flex items-center justify-center font-serif font-bold text-xs print:w-5 print:h-5 print:text-[10px]">
                      B
                    </div>
                    <div>
                      <span className="font-serif font-bold text-xs uppercase tracking-tight block text-black leading-none">
                        Bilik Baca
                      </span>
                      <span className="font-mono text-[8px] uppercase tracking-wider text-gray-700 block mt-0.5">
                        Perpustakaan Sekolah
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border border-black text-black">
                    KARTU ANGGOTA
                  </span>
                </div>

                {/* Badan Kartu: QR Code + Data Siswa */}
                <div className="flex items-center gap-3 py-2">
                  <div className="p-1 bg-white border border-black rounded shrink-0 print:p-0.5">
                    <img
                      src={`/api/v1/admin/qr?tipe=anggota&id=${selectedAnggota.id}`}
                      alt={`QR ${selectedAnggota.nama}`}
                      className="w-20 h-20 object-contain print:w-[22mm] print:h-[22mm]"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className="font-serif font-bold text-sm text-black truncate leading-tight print:text-xs">
                      {selectedAnggota.nama}
                    </h4>
                    <p className="font-mono text-xs text-black font-semibold print:text-[10px]">
                      NIS: {selectedAnggota.nomorInduk}
                    </p>
                    <p className="font-mono text-xs text-gray-800 print:text-[10px]">
                      Kelas: {selectedAnggota.kelas || "Umum"}
                    </p>
                    <p className="font-mono text-[9px] text-gray-600 print:text-[8px] capitalize">
                      Kategori: {selectedAnggota.jenis} • Aktif
                    </p>
                  </div>
                </div>

                {/* Footer Kartu & Garis Potong */}
                <div className="border-t border-black/60 pt-1.5 flex items-center justify-between text-[8px] font-mono text-gray-700 print:text-[7px]">
                  <span>Pindai QR saat presensi & peminjaman</span>
                  <span className="font-semibold text-black">Tahun Ajaran 2026/2027</span>
                </div>
              </div>
            </div>

            {/* Tombol Aksi - Tersembunyi saat Cetak */}
            <div className="pt-2 flex items-center justify-end gap-2 print:hidden">
              <button
                onClick={() => setModalCetakBuka(false)}
                className="px-4 py-2 rounded-lg border border-line bg-surface text-ink text-xs font-semibold hover:bg-paper-sunken"
              >
                Batal
              </button>
              <a
                href={`/admin/anggota/cetak-kartu?id=${selectedAnggota.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-paper-sunken text-ink text-xs font-semibold shadow-xs"
                title="Buka halaman cetak mandiri tanpa gangguan latar belakang"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Lembar Mandiri</span>
              </a>
              <button
                onClick={cetakKartuTerisolasi}
                className="px-5 py-2 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 inline-flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu Fisik</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CETAK KARTU MASSAL A4 PER KELAS (8 KARTU PER LEMBAR A4)          */}
      {/* ========================================================================= */}
      {modalCetakMassalBuka && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 print:p-0 print:bg-white print:static print:block animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:h-auto print:max-h-none print:max-w-none print:w-full print:overflow-visible">
            {/* Header Dialog (Tersembunyi Saat Dicetak) */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-surface shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-ink-muted" />
                <div>
                  <h3 className="font-serif font-bold text-base text-ink">
                    Cetak Kartu Anggota Massal (Lembar Kertas A4)
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Total {anggotaUntukCetakMassal.length} siswa dalam format kisi 8 kartu per lembar A4 siap gunting.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Pilihan Kelas untuk Dicetak */}
                <select
                  value={kelasDipilihCetak}
                  onChange={(e) => setKelasDipilihCetak(e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-line bg-white text-xs font-mono min-h-[38px]"
                >
                  <option value="semua">Semua Siswa Terfilter ({anggotaUntukCetakMassal.length})</option>
                  {daftarKelasUnik.map((kls) => (
                    <option key={kls} value={kls}>
                      Khusus Kelas {kls}
                    </option>
                  ))}
                </select>

                <a
                  href={`/admin/anggota/cetak-kartu?kelas=${kelasDipilihCetak}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-paper-sunken text-ink text-xs font-semibold shadow-xs"
                  title="Buka halaman cetak mandiri tanpa gangguan latar belakang"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Lembar Mandiri</span>
                </a>

                <button
                  onClick={cetakKartuTerisolasi}
                  className="px-5 py-2 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen A4</span>
                </button>

                <button
                  onClick={() => setModalCetakMassalBuka(false)}
                  className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-paper-sunken"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Area Lembar Cetak A4: Kisi Presisi 2 Kolom x 4 Baris Siap Gunting */}
            <div className="flex-1 p-6 overflow-y-auto bg-paper print:bg-white print:p-0 print:overflow-visible">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[800px] mx-auto print:max-w-none print:grid-cols-2 print:gap-3 print:p-0">
                {anggotaUntukCetakMassal.map((m) => (
                  <div
                    key={m.id}
                    className="border-2 border-dashed border-ink/40 rounded-xl p-3 bg-white flex flex-col justify-between print:border print:border-dashed print:border-black print:rounded-none print:p-2.5 print-card-unit break-inside-avoid shadow-xs"
                  >
                    {/* Header Kartu Mini */}
                    <div className="flex items-center justify-between border-b border-black/70 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-black text-white flex items-center justify-center font-serif font-bold text-[9px] print:w-4 print:h-4 print:text-[8px]">
                          B
                        </div>
                        <span className="font-serif font-bold text-xs uppercase text-black leading-none print:text-[10px]">
                          Bilik Baca Perpustakaan
                        </span>
                      </div>
                      <span className="font-mono text-[8px] uppercase font-bold px-1 rounded border border-black text-black">
                        SISWA
                      </span>
                    </div>

                    {/* Isi Kartu */}
                    <div className="flex items-center gap-3 py-2">
                      <div className="p-0.5 bg-white border border-black rounded shrink-0">
                        <img
                          src={`/api/v1/admin/qr?tipe=anggota&id=${m.id}`}
                          alt={`QR ${m.nama}`}
                          className="w-18 h-18 object-contain print:w-[19mm] print:h-[19mm]"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="font-serif font-bold text-xs text-black truncate leading-tight print:text-[11px]">
                          {m.nama}
                        </h4>
                        <p className="font-mono text-xs text-black font-semibold print:text-[10px]">
                          NIS: {m.nomorInduk}
                        </p>
                        <p className="font-mono text-[11px] text-gray-800 print:text-[9px]">
                          Kelas: {m.kelas || "Umum"}
                        </p>
                      </div>
                    </div>

                    {/* Footer Garis Gunting */}
                    <div className="border-t border-black/50 pt-1 flex items-center justify-between text-[8px] font-mono text-gray-600 print:text-[7px]">
                      <span>Gunting mengikuti garis putus-putus</span>
                      <span>TA 2026/2027</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: IMPOR XLSX DUA LANGKAH (PRATINJAU -> COMMIT)                     */}
      {/* ========================================================================= */}
      {modalImporBuka && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in print:hidden">
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
      {/* MODAL 6: LAPORAN HASIL SINKRONISASI NETRI SMS                             */}
      {/* ========================================================================= */}
      {hasilSyncModal && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in print:hidden">
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
