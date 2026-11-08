"use client";

/**
 * Perpustakaan NETRI - Workstation Meja Sirkulasi Komputer
 * Mencakup Peminjaman Baru (Scan QR/NIS + Struk Bukti), Pengembalian Cepat,
 * dan Tabel Pemantauan Pinjaman Aktif & Keterlambatan (Perpanjang +7 Hari / Kembalikan).
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Repeat,
  Plus,
  Calendar,
  AlertCircle,
  Search,
  Printer,
  Clock,
  RotateCcw,
  Camera,
  ExternalLink,
} from "lucide-react";
import { QrCameraScanner } from "@/components/ui/QrCameraScanner";

interface AnggotaAktif {
  id: string;
  nama: string;
  nomorInduk: string;
  jenis: string;
  kelas: string | null;
  status: string;
}

interface ItemBukuKeranjang {
  eksemplarId: string;
  kode: string;
  judul: string;
  penulis: string;
  kategoriNama: string;
  lokasiRak: string;
}

interface PinjamanAktifItem {
  id: string;
  dipinjamPada: string;
  jatuhTempo: string;
  perpanjanganKe: number;
  anggotaId: string;
  namaAnggota: string;
  nomorInduk: string;
  kelas: string | null;
  eksemplarId: string;
  kodeEksemplar: string;
  bukuId: string;
  judulBuku: string;
  penulis: string;
  lokasiRak: string | null;
  terlambat: boolean;
  selisihHari: number;
  sisaHari: number;
  estimasiDendaRp: number;
}

interface BuktiStrukPinjam {
  batchId: string;
  namaPeminjam: string;
  nomorInduk: string;
  kelas: string | null;
  jumlahBuku: number;
  dipinjamPada: string;
  jatuhTempo: string;
  daftarBuku: Array<{ kode: string; judul: string }>;
}

export default function SirkulasiWorkstationPage() {
  const [tabAktif, setTabAktif] = useState<"pinjam" | "kembali" | "pantau">("pinjam");

  // State Peminjaman
  const [inputAnggota, setInputAnggota] = useState("");
  const [anggotaPeminjam, setAnggotaPeminjam] = useState<AnggotaAktif | null>(null);
  const [infoPinjamAnggota, setInfoPinjamAnggota] = useState<any>(null);
  const [loadingAnggota, setLoadingAnggota] = useState(false);

  const [inputBuku, setInputBuku] = useState("");
  const [keranjangBuku, setKeranjangBuku] = useState<ItemBukuKeranjang[]>([]);
  const [loadingBuku, setLoadingBuku] = useState(false);
  const [isSubmittingPinjam, setIsSubmittingPinjam] = useState(false);
  const [strukPinjam, setStrukPinjam] = useState<BuktiStrukPinjam | null>(null);

  // State Pengembalian
  const [inputKembali, setInputKembali] = useState("");
  const [loadingKembali, setLoadingKembali] = useState(false);
  const [riwayatKembali, setRiwayatKembali] = useState<any[]>([]);

  // State Pemantauan Sirkulasi Aktif
  const [daftarPinjamanAktif, setDaftarPinjamanAktif] = useState<PinjamanAktifItem[]>([]);
  const [loadingAktif, setLoadingAktif] = useState(false);
  const [cariAktif, setCariAktif] = useState("");
  const [filterAktif, setFilterAktif] = useState<"semua" | "terlambat">("semua");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal Kamera Live Scanner
  const [modalKamera, setModalKamera] = useState<"anggota" | "buku" | "kembali" | null>(null);

  // Notifikasi Toast
  const [notif, setNotif] = useState<{ tipe: "sukses" | "error"; pesan: string } | null>(null);

  const refInputAnggota = useRef<HTMLInputElement>(null);
  const refInputBuku = useRef<HTMLInputElement>(null);
  const refInputKembali = useRef<HTMLInputElement>(null);

  const tampilkanNotif = (pesan: string, tipe: "sukses" | "error") => {
    setNotif({ pesan, tipe });
    setTimeout(() => setNotif(null), 4500);
  };

  // Fungsi Cetak Bersih Slip Sirkulasi: Mengisolasi 100% Elemen Layar Komputer
  const cetakStrukTerisolasi = () => {
    document.body.setAttribute("data-print-mode", "struk");
    const bersihkanSetelahCetak = () => {
      document.body.removeAttribute("data-print-mode");
      window.removeEventListener("afterprint", bersihkanSetelahCetak);
    };
    window.addEventListener("afterprint", bersihkanSetelahCetak);
    window.print();
  };

  // Muat daftar peminjaman aktif
  const muatPinjamanAktif = useCallback(async () => {
    setLoadingAktif(true);
    try {
      const res = await fetch("/api/v1/admin/sirkulasi/aktif");
      const json = await res.json();
      if (json.sukses) {
        setDaftarPinjamanAktif(json.data.daftarPinjaman || []);
      }
    } catch {
      // Abaikan jika gagal memuat latar belakang
    } finally {
      setLoadingAktif(false);
    }
  }, []);

  useEffect(() => {
    muatPinjamanAktif();
  }, [muatPinjamanAktif]);

  useEffect(() => {
    if (tabAktif === "pinjam") {
      if (!anggotaPeminjam) {
        refInputAnggota.current?.focus();
      } else {
        refInputBuku.current?.focus();
      }
    } else if (tabAktif === "kembali") {
      refInputKembali.current?.focus();
    }
  }, [tabAktif, anggotaPeminjam]);

  // 1. Cari Anggota (Scan Kartu QR atau Ketik NIS)
  const prosesCariAnggota = async (kodeOrNis: string) => {
    const queryBersih = kodeOrNis.trim();
    if (!queryBersih || loadingAnggota) return;

    setLoadingAnggota(true);
    setNotif(null);

    try {
      const res = await fetch(
        `/api/v1/admin/sirkulasi/anggota?q=${encodeURIComponent(queryBersih)}`
      );
      const json = await res.json();

      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Anggota tidak ditemukan");
      }

      setAnggotaPeminjam(json.data.anggota);
      setInfoPinjamAnggota(json.data);
      setInputAnggota("");
      tampilkanNotif(`Anggota terdeteksi: ${json.data.anggota.nama}`, "sukses");
    } catch (err: any) {
      tampilkanNotif(err.message, "error");
    } finally {
      setLoadingAnggota(false);
    }
  };

  const handleCariAnggota = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await prosesCariAnggota(inputAnggota);
  };

  // 2. Scan Eksemplar Buku ke Keranjang
  const prosesTambahBuku = async (kodeBuku: string) => {
    const kodeBersih = kodeBuku.trim();
    if (!kodeBersih || loadingBuku) return;

    if (!anggotaPeminjam) {
      tampilkanNotif("Scan atau pilih kartu siswa peminjam terlebih dahulu!", "error");
      return;
    }

    if (keranjangBuku.length >= 5) {
      tampilkanNotif("Maksimal 5 buku dalam satu transaksi peminjaman!", "error");
      return;
    }

    if (keranjangBuku.some((b) => b.kode.toLowerCase() === kodeBersih.toLowerCase())) {
      tampilkanNotif("Buku ini sudah ada di dalam keranjang!", "error");
      setInputBuku("");
      return;
    }

    setLoadingBuku(true);
    setNotif(null);

    try {
      const res = await fetch(
        `/api/v1/admin/sirkulasi/eksemplar?kode=${encodeURIComponent(kodeBersih)}`
      );
      const json = await res.json();

      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Eksemplar buku tidak ditemukan");
      }

      if (!json.data.tersedia) {
        throw new Error(json.data.alasanTolak || "Buku tidak tersedia untuk dipinjam");
      }

      setKeranjangBuku((prev) => [...prev, json.data]);
      setInputBuku("");
      tampilkanNotif(`Buku '${json.data.judul}' dimasukkan ke keranjang`, "sukses");
    } catch (err: any) {
      tampilkanNotif(err.message, "error");
    } finally {
      setLoadingBuku(false);
    }
  };

  const handleTambahBuku = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await prosesTambahBuku(inputBuku);
  };

  // 3. Konfirmasi Transaksi Peminjaman Atomik
  const handleKonfirmasiPinjam = async () => {
    if (!anggotaPeminjam || keranjangBuku.length === 0 || isSubmittingPinjam) return;

    setIsSubmittingPinjam(true);
    setNotif(null);

    try {
      const res = await fetch("/api/v1/admin/sirkulasi/pinjam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anggotaId: anggotaPeminjam.id,
          kodeEksemplar: keranjangBuku.map((b) => b.kode),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal mencatat peminjaman");
      }

      // Tampilkan modal struk bukti peminjaman dan simpan ke sessionStorage untuk rute mandiri
      const dataStrukFinal: BuktiStrukPinjam = {
        batchId: json.data.batchId,
        namaPeminjam: anggotaPeminjam.nama,
        nomorInduk: anggotaPeminjam.nomorInduk,
        kelas: anggotaPeminjam.kelas,
        jumlahBuku: json.data.jumlahBuku,
        dipinjamPada: json.data.dipinjamPada,
        jatuhTempo: json.data.jatuhTempo,
        daftarBuku: json.data.daftarBuku,
      };
      setStrukPinjam(dataStrukFinal);
      try {
        sessionStorage.setItem("bilikbaca_last_struk", JSON.stringify(dataStrukFinal));
      } catch (e) {
        console.warn("Gagal menyimpan ke sessionStorage:", e);
      }

      tampilkanNotif(
        `Sukses! ${json.data.jumlahBuku} buku berhasil dipinjamkan hingga ${json.data.jatuhTempo}.`,
        "sukses"
      );

      // Reset form transaksi
      setAnggotaPeminjam(null);
      setInfoPinjamAnggota(null);
      setKeranjangBuku([]);
      setInputAnggota("");
      setInputBuku("");
      muatPinjamanAktif();
    } catch (err: any) {
      tampilkanNotif(err.message, "error");
    } finally {
      setIsSubmittingPinjam(false);
    }
  };

  // 4. Pengembalian Buku Cepat (Dari Form Scan atau Tombol Tabel Aktif)
  const prosesKembalikanKode = async (kode: string) => {
    setLoadingKembali(true);
    setNotif(null);

    try {
      const res = await fetch("/api/v1/admin/sirkulasi/kembali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kodeEksemplar: kode.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal memproses pengembalian");
      }

      const hasil = json.data;
      setRiwayatKembali((prev) => [hasil, ...prev.slice(0, 9)]);
      setInputKembali("");
      tampilkanNotif(
        `Buku '${hasil.judul}' (${hasil.kodeEksemplar}) berhasil dikembalikan.`,
        "sukses"
      );
      muatPinjamanAktif();
    } catch (err: any) {
      tampilkanNotif(err.message, "error");
    } finally {
      setLoadingKembali(false);
    }
  };

  const handlePengembalian = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputKembali.trim() || loadingKembali) return;
    await prosesKembalikanKode(inputKembali);
  };

  // 5. Perpanjang Masa Pinjam (+7 Hari)
  const handlePerpanjangPinjam = async (peminjamanId: string) => {
    setProcessingId(peminjamanId);
    try {
      const res = await fetch("/api/v1/admin/sirkulasi/perpanjang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peminjamanId }),
      });
      const json = await res.json();

      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal memperpanjang masa pinjam");
      }

      tampilkanNotif(
        `Jatuh tempo '${json.data.judul}' diperpanjang hingga ${json.data.jatuhTempoBaru}.`,
        "sukses"
      );
      muatPinjamanAktif();
    } catch (err: any) {
      tampilkanNotif(err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Filter daftar pinjaman aktif
  const pinjamanTerfilter = daftarPinjamanAktif.filter((item) => {
    if (filterAktif === "terlambat" && !item.terlambat) return false;
    if (cariAktif.trim()) {
      const q = cariAktif.toLowerCase();
      return (
        item.namaAnggota.toLowerCase().includes(q) ||
        item.nomorInduk.toLowerCase().includes(q) ||
        item.judulBuku.toLowerCase().includes(q) ||
        item.kodeEksemplar.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalTerlambat = daftarPinjamanAktif.filter((p) => p.terlambat).length;

  return (
    <div className="space-y-6 max-w-[1440px] sirkulasi-view">
      {/* Toast Notifikasi */}
      {notif && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-lg shadow-lg border flex items-center gap-3 text-sm font-medium animate-fade-in print:hidden ${
            notif.tipe === "sukses"
              ? "bg-status-tersedia text-white border-status-tersedia/20"
              : "bg-danger text-white border-danger/20"
          }`}
        >
          {notif.tipe === "sukses" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{notif.pesan}</span>
        </div>
      )}

      {/* Header Meja Sirkulasi */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4 print:hidden sirkulasi-header">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Meja Sirkulasi Komputer</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Workstation pencatatan sirkulasi buku dengan pemindai barcode/QR USB & pemantauan jatuh tempo.
          </p>
        </div>

        {/* Tab Pilihan: Pinjam vs Kembali vs Pantau Aktif */}
        <div className="flex items-center p-1 rounded-lg bg-surface border border-line">
          <button
            onClick={() => setTabAktif("pinjam")}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all min-h-[38px] ${
              tabAktif === "pinjam"
                ? "bg-ink text-paper shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Peminjaman Baru
          </button>
          <button
            onClick={() => setTabAktif("kembali")}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all min-h-[38px] ${
              tabAktif === "kembali"
                ? "bg-ink text-paper shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Pengembalian Cepat
          </button>
          <button
            onClick={() => setTabAktif("pantau")}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all min-h-[38px] inline-flex items-center gap-2 ${
              tabAktif === "pantau"
                ? "bg-ink text-paper shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <span>Pinjaman Aktif ({daftarPinjamanAktif.length})</span>
            {totalTerlambat > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-danger text-white text-[10px] font-mono">
                {totalTerlambat} Terlambat
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MEJA PEMINJAMAN DUA KOLOM                                         */}
      {/* ========================================================================= */}
      {tabAktif === "pinjam" && (
        <div className="grid grid-cols-12 gap-8 items-start print:hidden">
          {/* Kolom Kiri (5 Kolom): Identitas Siswa Peminjam */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-ink text-paper text-[10px] font-bold flex items-center justify-center font-sans">
                    1
                  </span>
                  <span className="font-sans text-xs uppercase font-bold text-ink tracking-wider">
                    Identitas Peminjam
                  </span>
                </div>
                {anggotaPeminjam && (
                  <button
                    onClick={() => {
                      setAnggotaPeminjam(null);
                      setInfoPinjamAnggota(null);
                      setKeranjangBuku([]);
                    }}
                    className="text-xs text-danger hover:underline font-medium"
                  >
                    Ganti Siswa
                  </button>
                )}
              </div>

              {!anggotaPeminjam ? (
                /* Form Scan / Ketik Kartu Siswa */
                <form onSubmit={handleCariAnggota} className="space-y-3">
                  <label
                    htmlFor="scanAnggota"
                    className="block text-xs text-ink-muted font-medium"
                  >
                    Scan Kartu QR Siswa atau Ketik NIS:
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={refInputAnggota}
                      id="scanAnggota"
                      type="text"
                      value={inputAnggota}
                      onChange={(e) => setInputAnggota(e.target.value)}
                      placeholder="Scan kartu atau ketik NIS..."
                      className="flex-1 px-3.5 py-2.5 rounded-md border border-line bg-white font-sans text-sm focus:border-ink min-h-[44px]"
                      disabled={loadingAnggota}
                    />
                    <button
                      type="button"
                      onClick={() => setModalKamera("anggota")}
                      title="Buka Scanner Kamera Webcam"
                      className="px-3 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold min-h-[44px]"
                    >
                      <Camera className="w-4 h-4 text-group-hiburan" />
                    </button>
                    <button
                      type="submit"
                      disabled={loadingAnggota || !inputAnggota.trim()}
                      className="px-4 py-2.5 rounded-md bg-ink text-paper text-xs font-semibold min-h-[44px] hover:bg-ink/90 disabled:opacity-50"
                    >
                      {loadingAnggota ? "Mencari..." : "Pilih"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Kartu Data Siswa Terpilih */
                <div className="space-y-4">
                  <div className="flex items-start gap-3.5 p-4 rounded-lg bg-paper-sunken/40 border border-line">
                    <div className="w-12 h-12 rounded-full bg-ink text-paper flex items-center justify-center font-bold text-lg font-serif">
                      {anggotaPeminjam.nama.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-bold text-base text-ink truncate">
                        {anggotaPeminjam.nama}
                      </h3>
                      <p className="font-mono text-xs text-ink-muted mt-0.5">
                        NIS: {anggotaPeminjam.nomorInduk} • Kelas: {anggotaPeminjam.kelas || "Umum"}
                      </p>
                    </div>
                  </div>

                  {/* Status Pinjaman Aktif */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-line/60">
                      <span className="text-ink-muted">Pinjaman Aktif:</span>
                      <span className="font-mono font-bold text-ink">
                        {infoPinjamAnggota?.totalPinjamAktif || 0} dari{" "}
                        {infoPinjamAnggota?.batasMaks || 3} buku
                      </span>
                    </div>

                    {infoPinjamAnggota?.alasanTolak && (
                      <div className="p-3 rounded bg-danger/10 text-danger flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{infoPinjamAnggota.alasanTolak}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan (7 Kolom): Keranjang Buku yang Discan */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <div className="bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-ink text-paper text-[10px] font-bold flex items-center justify-center font-sans">
                    2
                  </span>
                  <span className="font-sans text-xs uppercase font-bold text-ink tracking-wider">
                    Eksemplar Buku yang Dipinjam
                  </span>
                </div>
                <span className="font-sans text-xs text-ink-muted bg-paper-sunken px-2.5 py-0.5 rounded-full font-medium">
                  {keranjangBuku.length} / 5 Buku
                </span>
              </div>

              {/* Form Scan Barcode Eksemplar Buku */}
              <form onSubmit={handleTambahBuku} className="flex gap-2">
                <input
                  ref={refInputBuku}
                  type="text"
                  value={inputBuku}
                  onChange={(e) => setInputBuku(e.target.value)}
                  placeholder={
                    anggotaPeminjam
                      ? "Scan Barcode/QR Eksemplar Buku (misal: BB-NVL-0001)..."
                      : "Pilih siswa terlebih dahulu di sisi kiri..."
                  }
                  disabled={!anggotaPeminjam || loadingBuku}
                  className="flex-1 px-4 py-2.5 rounded-md border border-line bg-white font-sans text-sm focus:border-ink min-h-[44px] disabled:bg-paper-sunken/40"
                />
                <button
                  type="button"
                  disabled={!anggotaPeminjam}
                  onClick={() => setModalKamera("buku")}
                  title="Scan Buku Lewat Kamera Webcam"
                  className="px-3 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold min-h-[44px] disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 text-group-pelajaran" />
                </button>
                <button
                  type="submit"
                  disabled={!anggotaPeminjam || loadingBuku || !inputBuku.trim()}
                  className="px-5 py-2.5 rounded-md bg-ink text-paper text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-ink/90 disabled:opacity-50 min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah</span>
                </button>
              </form>

              {/* Tabel Keranjang Eksemplar */}
              <div className="border border-line rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper-sunken/60 font-sans text-[11px] font-semibold tracking-wider uppercase text-ink-muted border-b border-line">
                    <tr>
                      <th className="py-2.5 px-3">Kode</th>
                      <th className="py-2.5 px-3">Judul Buku</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3 text-center">Batal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {keranjangBuku.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-ink-muted font-sans">
                          Keranjang masih kosong. Scan label QR pada buku siswa.
                        </td>
                      </tr>
                    ) : (
                      keranjangBuku.map((item, index) => (
                        <tr key={item.eksemplarId} className="hover:bg-paper-sunken/20">
                          <td className="py-2.5 px-3 font-mono font-bold text-ink">{item.kode}</td>
                          <td className="py-2.5 px-3 font-medium text-ink">{item.judul}</td>
                          <td className="py-2.5 px-3 font-mono text-ink-muted">
                            {item.kategoriNama}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() =>
                                setKeranjangBuku((prev) => prev.filter((_, i) => i !== index))
                              }
                              className="text-danger hover:text-danger/80 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tombol Konfirmasi Final */}
              <div className="pt-3 flex justify-end">
                <button
                  onClick={handleKonfirmasiPinjam}
                  disabled={
                    !anggotaPeminjam ||
                    keranjangBuku.length === 0 ||
                    isSubmittingPinjam ||
                    infoPinjamAnggota?.bolehPinjam === false
                  }
                  className="px-6 py-3 rounded-lg bg-status-tersedia text-white font-semibold text-sm inline-flex items-center gap-2 hover:brightness-105 disabled:opacity-40 transition-all min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmittingPinjam
                      ? "Menyimpan Transaksi..."
                      : `Konfirmasi Pinjam (${keranjangBuku.length} Buku)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENGEMBALIAN BUKU CEPAT (SATU LANGKAH)                            */}
      {/* ========================================================================= */}
      {tabAktif === "kembali" && (
        <div className="grid grid-cols-12 gap-8 items-start print:hidden">
          {/* Form Scan Pengembalian */}
          <div className="col-span-12 lg:col-span-5 bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4">
            <div className="border-b border-line pb-3">
              <h2 className="font-serif font-bold text-lg text-ink">Scan Buku Kembali</h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Scan langsung label eksemplar buku tanpa perlu scan kartu siswa.
              </p>
            </div>

            <form onSubmit={handlePengembalian} className="space-y-3">
              <div className="flex gap-2">
                <input
                  ref={refInputKembali}
                  type="text"
                  value={inputKembali}
                  onChange={(e) => setInputKembali(e.target.value)}
                  placeholder="Scan QR/Barcode Eksemplar (misal: BB-NVL-0001)..."
                  className="flex-1 px-4 py-3 rounded-md border border-line bg-white font-sans text-sm focus:border-ink min-h-[44px]"
                  disabled={loadingKembali}
                />
                <button
                  type="button"
                  onClick={() => setModalKamera("kembali")}
                  title="Scan Pengembalian Lewat Kamera"
                  className="px-3 py-3 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold min-h-[44px]"
                >
                  <Camera className="w-4 h-4 text-ink-muted" />
                </button>
                <button
                  type="submit"
                  disabled={loadingKembali || !inputKembali.trim()}
                  className="px-5 py-3 rounded-md bg-ink text-paper text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-ink/90 disabled:opacity-50 min-h-[44px]"
                >
                  <Repeat className="w-4 h-4" />
                  <span>Proses</span>
                </button>
              </div>
            </form>
          </div>

          {/* Riwayat Pengembalian Hari Ini */}
          <div className="col-span-12 lg:col-span-7 bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4">
            <div className="border-b border-line pb-3 flex items-center justify-between">
              <h3 className="font-serif font-semibold text-lg text-ink">
                Buku yang Baru Saja Dikembalikan
              </h3>
              <span className="font-sans text-xs text-ink-muted font-medium">Sesi Meja Ini</span>
            </div>

            <div className="divide-y divide-line/60">
              {riwayatKembali.length === 0 ? (
                <p className="py-8 text-center text-xs text-ink-muted font-sans">
                  Belum ada buku yang dikembalikan pada sesi ini.
                </p>
              ) : (
                riwayatKembali.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-ink">{item.judul}</h4>
                      <p className="font-mono text-xs text-ink-muted">
                        Kode: {item.kodeEksemplar} • Peminjam: {item.namaPeminjam}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs text-status-tersedia font-semibold block">
                        Diterima {item.dikembalikanPada} WIB
                      </span>
                      {item.terlambat && (
                        <span className="text-[11px] font-mono text-danger font-medium block">
                          Terlambat {item.selisihHari} Hari
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3 / PANEL BAWAH: PEMANTAUAN PINJAMAN AKTIF & PERPANJANGAN             */}
      {/* ========================================================================= */}
      <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden print:hidden sirkulasi-table">
        <div className="px-6 py-4 border-b border-line flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif font-semibold text-lg text-ink">
              Daftar Peminjaman Aktif & Jatuh Tempo
            </h2>
            <p className="text-xs text-ink-muted">
              Kelola perpanjangan masa pinjam (+7 hari) atau proses pengembalian langsung dari daftar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Pencarian Cepat */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={cariAktif}
                onChange={(e) => setCariAktif(e.target.value)}
                placeholder="Cari siswa, NIS, judul, kode..."
                className="pl-8 pr-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[36px] w-56 font-sans"
              />
            </div>

            {/* Filter Semua / Terlambat */}
            <div className="flex items-center rounded-md border border-line bg-paper-sunken/40 p-0.5 text-xs font-sans">
              <button
                onClick={() => setFilterAktif("semua")}
                className={`px-3 py-1 rounded font-medium ${
                  filterAktif === "semua" ? "bg-white text-ink font-semibold shadow-sm" : "text-ink-muted"
                }`}
              >
                Semua ({daftarPinjamanAktif.length})
              </button>
              <button
                onClick={() => setFilterAktif("terlambat")}
                className={`px-3 py-1 rounded font-medium ${
                  filterAktif === "terlambat"
                    ? "bg-danger text-white font-semibold shadow-sm"
                    : "text-ink-muted"
                }`}
              >
                Terlambat ({totalTerlambat})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-paper-sunken/60 font-sans text-[11px] font-semibold tracking-wider uppercase text-ink-muted border-b border-line">
              <tr>
                <th className="py-3 px-4">Kode Eksemplar</th>
                <th className="py-3 px-4">Judul Buku</th>
                <th className="py-3 px-4">Peminjam</th>
                <th className="py-3 px-4">Tgl Pinjam</th>
                <th className="py-3 px-4">Jatuh Tempo</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loadingAktif ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-ink-muted">
                    Memuat daftar peminjaman aktif...
                  </td>
                </tr>
              ) : pinjamanTerfilter.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-ink-muted">
                    Tidak ada transaksi peminjaman aktif yang sesuai filter.
                  </td>
                </tr>
              ) : (
                pinjamanTerfilter.map((item) => (
                  <tr key={item.id} className="hover:bg-paper-sunken/20">
                    <td className="py-3 px-4 font-mono font-bold text-ink">
                      {item.kodeEksemplar}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-ink">{item.judulBuku}</div>
                      <div className="text-[11px] text-ink-muted">
                        Rak: {item.lokasiRak || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-ink">{item.namaAnggota}</div>
                      <div className="font-mono text-[11px] text-ink-muted">
                        {item.nomorInduk} • {item.kelas || "Umum"}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-ink-muted">
                      {new Date(item.dipinjamPada).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className={item.terlambat ? "text-danger font-bold" : "text-ink"}>
                        {new Date(item.jatuhTempo).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {item.perpanjanganKe > 0 && (
                        <span className="block text-[10px] text-ink-muted">
                          Diperpanjang {item.perpanjanganKe}x
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.terlambat ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-danger/10 text-danger font-mono font-semibold text-[11px]">
                            <Clock className="w-3 h-3" />
                            Terlambat {item.selisihHari} hr
                          </span>
                          {item.estimasiDendaRp > 0 && (
                            <div className="font-mono text-[11px] text-danger mt-0.5">
                              Denda: Rp {item.estimasiDendaRp.toLocaleString("id-ID")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-status-tersedia/10 text-status-tersedia font-mono text-[11px]">
                          Sisa {item.sisaHari} hari
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handlePerpanjangPinjam(item.id)}
                          disabled={
                            item.terlambat ||
                            item.perpanjanganKe >= 1 ||
                            processingId === item.id
                          }
                          title={
                            item.terlambat
                              ? "Tidak dapat memperpanjang buku yang terlambat"
                              : item.perpanjanganKe >= 1
                              ? "Sudah mencapai batas perpanjangan 1x"
                              : "Perpanjang masa pinjam +7 hari"
                          }
                          className="px-2.5 py-1.5 rounded border border-line bg-white hover:bg-paper-sunken text-ink font-medium inline-flex items-center gap-1 disabled:opacity-40"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>+7 Hari</span>
                        </button>
                        <button
                          onClick={() => prosesKembalikanKode(item.kodeEksemplar)}
                          disabled={loadingKembali}
                          className="px-2.5 py-1.5 rounded bg-ink text-paper hover:bg-ink/90 font-semibold inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Kembalikan</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL STRUK BUKTI PEMINJAMAN (FORMAT THERMAL 80MM / SLIP RESMI)           */}
      {/* ========================================================================= */}
      {strukPinjam && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:block">
          <div className="bg-surface border border-line rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 print:border-none print:shadow-none print:p-0 print:max-w-none">
            {/* Header Modal - Tersembunyi saat Cetak */}
            <div className="flex items-center justify-between border-b border-line pb-3 print:hidden">
              <div className="flex items-center gap-2 text-status-tersedia">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-serif font-bold text-lg text-ink">
                  Bukti Peminjaman Buku Selesai
                </h3>
              </div>
              <button
                onClick={() => setStrukPinjam(null)}
                className="text-ink-muted hover:text-ink p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Area Cetak Struk Fisik: Format Lebar 80mm Kompatibel Printer Kasir & A4 */}
            <div className="flex justify-center print:block print:m-0 print:p-0">
              <div className="w-full max-w-sm p-5 rounded-lg border-2 border-dashed border-ink/40 bg-white space-y-3 text-xs font-mono print:border print:border-black print:rounded-none print:p-4 print:max-w-[80mm] print:text-[10px] break-inside-avoid shadow-xs">
                {/* Header Struk Resmi */}
                <div className="text-center border-b border-black pb-2 space-y-0.5">
                  <div className="font-serif font-bold text-sm text-black tracking-tight uppercase">
                    Perpustakaan NETRI
                  </div>
                  <div className="text-[10px] text-gray-700">
                    SLIP BUKTI PEMINJAMAN KOLEKSI
                  </div>
                  <div className="text-[9px] text-gray-600 font-mono">
                    Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} • {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                  </div>
                </div>

                {/* Data Peminjam */}
                <div className="space-y-1 text-black border-b border-black/40 pb-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Peminjam:</span>
                    <span className="font-bold truncate max-w-[180px]">{strukPinjam.namaPeminjam}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">NIS / Kelas:</span>
                    <span className="font-semibold">
                      {strukPinjam.nomorInduk} / {strukPinjam.kelas || "Umum"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tgl Pinjam:</span>
                    <span>{strukPinjam.dipinjamPada}</span>
                  </div>
                  <div className="flex justify-between font-bold text-black border-t border-black/20 pt-1">
                    <span>Jatuh Tempo:</span>
                    <span className="border-b border-black pb-0.5">{strukPinjam.jatuhTempo}</span>
                  </div>
                </div>

                {/* Daftar Buku yang Dipinjam */}
                <div className="space-y-1.5 border-b border-black/40 pb-2">
                  <div className="text-[10px] uppercase font-bold text-gray-800">
                    Buku Dipinjam ({strukPinjam.jumlahBuku} Unit):
                  </div>
                  {strukPinjam.daftarBuku.map((b, i) => (
                    <div key={i} className="flex justify-between items-start gap-2 text-[10px]">
                      <span className="font-bold font-mono shrink-0">{b.kode}</span>
                      <span className="text-right truncate flex-1">{b.judul}</span>
                    </div>
                  ))}
                </div>

                {/* Catatan Peraturan Perpustakaan */}
                <div className="text-[9px] text-center text-gray-700 leading-tight">
                  Masa pinjam 7 hari. Keterlambatan dikenakan denda sesuai tata tertib perpustakaan sekolah.
                </div>

                {/* Kolom Tanda Tangan */}
                <div className="grid grid-cols-2 gap-4 pt-3 text-[9px] text-center text-black">
                  <div>
                    <p className="text-gray-600">Peminjam,</p>
                    <div className="h-10 print:h-8" />
                    <p className="font-bold border-t border-black/60 pt-0.5 truncate">
                      {strukPinjam.namaPeminjam}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Petugas Jaga,</p>
                    <div className="h-10 print:h-8" />
                    <p className="font-bold border-t border-black/60 pt-0.5">
                      Perpustakaan NETRI
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tombol Aksi - Tersembunyi saat Cetak */}
            <div className="flex justify-end items-center gap-2 pt-2 border-t border-line print:hidden">
              <button
                onClick={() => setStrukPinjam(null)}
                className="px-4 py-2 rounded-lg border border-line bg-surface text-ink text-xs font-semibold hover:bg-paper-sunken min-h-[40px]"
              >
                Tutup
              </button>
              <a
                href="/admin/sirkulasi/cetak-struk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-paper-sunken text-ink text-xs font-semibold min-h-[40px] shadow-xs"
                title="Buka slip cetak mandiri tanpa gangguan latar belakang"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Lembar Mandiri</span>
              </a>
              <button
                onClick={cetakStrukTerisolasi}
                className="px-5 py-2 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 inline-flex items-center gap-1.5 min-h-[40px] shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk Fisik</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PEMINDAI KAMERA WEBCAM LIVE                                        */}
      {/* ========================================================================= */}
      {modalKamera && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-ink">
                  {modalKamera === "anggota"
                    ? "Scan Kartu QR Siswa / Peminjam"
                    : modalKamera === "buku"
                    ? "Scan Label QR / Barcode Eksemplar Buku"
                    : "Scan Buku Pengembalian"}
                </h3>
                <p className="text-xs text-ink-muted">
                  Arahkan barcode atau kartu QR tepat ke kotak pemindai kamera
                </p>
              </div>
              <button
                onClick={() => setModalKamera(null)}
                className="p-1 rounded text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <QrCameraScanner
              label={
                modalKamera === "anggota"
                  ? "Posisikan Kartu Siswa di Depan Lensa"
                  : "Posisikan Stiker QR / Barcode Buku di Depan Lensa"
              }
              onScan={(kode) => {
                if (modalKamera === "anggota") {
                  prosesCariAnggota(kode);
                } else if (modalKamera === "buku") {
                  prosesTambahBuku(kode);
                } else if (modalKamera === "kembali") {
                  prosesKembalikanKode(kode);
                }
                setModalKamera(null);
              }}
              onClose={() => setModalKamera(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
