"use client";

import { useState, useRef, useEffect } from "react";
import {
  QrCode,
  User,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  X,
  Repeat,
  Plus,
  Send,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { BadgeStatus } from "@/components/ui/Badge";

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

export default function SirkulasiWorkstationPage() {
  const [tabAktif, setTabAktif] = useState<"pinjam" | "kembali">("pinjam");

  // State Peminjaman
  const [inputAnggota, setInputAnggota] = useState("");
  const [anggotaPeminjam, setAnggotaPeminjam] = useState<AnggotaAktif | null>(null);
  const [infoPinjamAnggota, setInfoPinjamAnggota] = useState<any>(null);
  const [loadingAnggota, setLoadingAnggota] = useState(false);

  const [inputBuku, setInputBuku] = useState("");
  const [keranjangBuku, setKeranjangBuku] = useState<ItemBukuKeranjang[]>([]);
  const [loadingBuku, setLoadingBuku] = useState(false);
  const [isSubmittingPinjam, setIsSubmittingPinjam] = useState(false);

  // State Pengembalian
  const [inputKembali, setInputKembali] = useState("");
  const [loadingKembali, setLoadingKembali] = useState(false);
  const [riwayatKembali, setRiwayatKembali] = useState<any[]>([]);

  // Notifikasi Toast
  const [notif, setNotif] = useState<{ tipe: "sukses" | "error"; pesan: string } | null>(null);

  const refInputAnggota = useRef<HTMLInputElement>(null);
  const refInputBuku = useRef<HTMLInputElement>(null);
  const refInputKembali = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tabAktif === "pinjam") {
      if (!anggotaPeminjam) {
        refInputAnggota.current?.focus();
      } else {
        refInputBuku.current?.focus();
      }
    } else {
      refInputKembali.current?.focus();
    }
  }, [tabAktif, anggotaPeminjam]);

  const tampilkanNotif = (pesan: string, tipe: "sukses" | "error") => {
    setNotif({ pesan, tipe });
    setTimeout(() => setNotif(null), 4000);
  };

  // 1. Cari Anggota (Scan Kartu QR atau Ketik NIS)
  const handleCariAnggota = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputAnggota.trim() || loadingAnggota) return;

    setLoadingAnggota(true);
    setNotif(null);

    try {
      const res = await fetch(`/api/v1/admin/sirkulasi/anggota?q=${encodeURIComponent(inputAnggota.trim())}`);
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

  // 2. Scan Eksemplar Buku ke Keranjang
  const handleTambahBuku = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputBuku.trim() || loadingBuku) return;

    if (!anggotaPeminjam) {
      tampilkanNotif("Scan atau pilih kartu siswa peminjam terlebih dahulu!", "error");
      return;
    }

    if (keranjangBuku.length >= 5) {
      tampilkanNotif("Maksimal 5 buku dalam satu transaksi peminjaman!", "error");
      return;
    }

    const kodeBersih = inputBuku.trim();
    if (keranjangBuku.some((b) => b.kode.toLowerCase() === kodeBersih.toLowerCase())) {
      tampilkanNotif("Buku ini sudah ada di dalam keranjang!", "error");
      setInputBuku("");
      return;
    }

    setLoadingBuku(true);
    setNotif(null);

    try {
      const res = await fetch(`/api/v1/admin/sirkulasi/eksemplar?kode=${encodeURIComponent(kodeBersih)}`);
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
    } catch (err: any) {
      tampilkanNotif(err.message, "error");
    } finally {
      setIsSubmittingPinjam(false);
    }
  };

  // 4. Pengembalian Buku Cepat
  const handlePengembalian = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputKembali.trim() || loadingKembali) return;

    setLoadingKembali(true);
    setNotif(null);

    try {
      const res = await fetch("/api/v1/admin/sirkulasi/kembali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kodeEksemplar: inputKembali.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal memproses pengembalian");
      }

      const hasil = json.data;
      setRiwayatKembali((prev) => [hasil, ...prev.slice(0, 9)]);
      setInputKembali("");
      tampilkanNotif(
        `Buku '${hasil.judul}' (${hasil.kodeEksemplar}) berhasil dikembalikan. Status telah tersedia.`,
        "sukses"
      );
    } catch (err: any) {
      tampilkanNotif(err.message, "error");
    } finally {
      setLoadingKembali(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px]">
      {/* Toast Notifikasi */}
      {notif && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-lg shadow-lg border flex items-center gap-3 text-sm font-medium animate-fade-in ${
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
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Meja Sirkulasi Komputer</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Workstation pencatatan sirkulasi buku dengan pemindai barcode/QR USB & kamera.
          </p>
        </div>

        {/* Tab Pilihan: Pinjam vs Kembali */}
        <div className="flex items-center p-1 rounded-lg bg-surface border border-line">
          <button
            onClick={() => setTabAktif("pinjam")}
            className={`px-5 py-2 rounded-md text-xs font-semibold transition-all min-h-[38px] ${
              tabAktif === "pinjam"
                ? "bg-ink text-paper shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Peminjaman Baru
          </button>
          <button
            onClick={() => setTabAktif("kembali")}
            className={`px-5 py-2 rounded-md text-xs font-semibold transition-all min-h-[38px] ${
              tabAktif === "kembali"
                ? "bg-ink text-paper shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Pengembalian Buku
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MEJA PEMINJAMAN DUA KOLOM                                         */}
      {/* ========================================================================= */}
      {tabAktif === "pinjam" && (
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri (5 Kolom): Identitas Siswa Peminjam */}
          <div className="col-span-5 space-y-6">
            <div className="bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="font-mono text-xs uppercase font-bold text-ink">
                  1. Identitas Peminjam
                </span>
                {anggotaPeminjam && (
                  <button
                    onClick={() => {
                      setAnggotaPeminjam(null);
                      setInfoPinjamAnggota(null);
                      setKeranjangBuku([]);
                    }}
                    className="text-xs text-danger hover:underline"
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
                      className="flex-1 px-3.5 py-2.5 rounded-md border border-line bg-white font-mono text-sm focus:border-ink min-h-[44px]"
                      disabled={loadingAnggota}
                    />
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
                        {infoPinjamAnggota?.totalPinjamAktif || 0} dari {infoPinjamAnggota?.batasMaks || 3} buku
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
          <div className="col-span-7 space-y-6">
            <div className="bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="font-mono text-xs uppercase font-bold text-ink">
                  2. Eksemplar Buku yang Dipinjam
                </span>
                <span className="font-mono text-xs text-ink-muted">
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
                  className="flex-1 px-4 py-2.5 rounded-md border border-line bg-white font-mono text-sm focus:border-ink min-h-[44px] disabled:bg-paper-sunken/40"
                />
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
                  <thead className="bg-paper-sunken/60 font-mono uppercase text-ink-muted border-b border-line">
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
                        <td colSpan={4} className="py-8 text-center text-ink-muted">
                          Keranjang masih kosong. Scan label QR pada buku siswa.
                        </td>
                      </tr>
                    ) : (
                      keranjangBuku.map((item, index) => (
                        <tr key={item.eksemplarId} className="hover:bg-paper-sunken/20">
                          <td className="py-2.5 px-3 font-mono font-bold text-ink">{item.kode}</td>
                          <td className="py-2.5 px-3 font-medium text-ink">{item.judul}</td>
                          <td className="py-2.5 px-3 font-mono text-ink-muted">{item.kategoriNama}</td>
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
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Form Scan Pengembalian */}
          <div className="col-span-5 bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4">
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
                  placeholder="Scan QR/Barcode Eksemplar (misal: BB-000101)..."
                  className="flex-1 px-4 py-3 rounded-md border border-line bg-white font-mono text-sm focus:border-ink min-h-[44px]"
                  disabled={loadingKembali}
                />
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
          <div className="col-span-7 bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4">
            <div className="border-b border-line pb-3 flex items-center justify-between">
              <h3 className="font-serif font-semibold text-lg text-ink">
                Buku yang Baru Saja Dikembalikan
              </h3>
              <span className="font-mono text-xs text-ink-muted">Sesi Meja Ini</span>
            </div>

            <div className="divide-y divide-line/60">
              {riwayatKembali.length === 0 ? (
                <p className="py-8 text-center text-xs text-ink-muted">
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
    </div>
  );
}
