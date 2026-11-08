"use client";

/**
 * Perpustakaan NETRI - Halaman Pusat Laporan & Ekspor Data Perpustakaan
 * Menyediakan rekapan sirkulasi, data denda keterlambatan, rekapitulasi absensi per kelas,
 * peringkat 10 buku terpopuler & 10 siswa pembaca teraktif, serta ekspor CSV & cetak laporan resmi.
 */

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Search,
  BookOpen,
  Users,
  Award,
  TrendingUp,
  Clock,
  Filter,
  CheckCircle2,
} from "lucide-react";

export default function AdminLaporanPage() {
  const [tabAktif, setTabAktif] = useState<"sirkulasi" | "kunjungan" | "peringkat">("sirkulasi");
  const [dariTanggal, setDariTanggal] = useState("");
  const [sampaiTanggal, setSampaiTanggal] = useState("");
  const [loading, setLoading] = useState(true);
  const [dataLaporan, setDataLaporan] = useState<any | null>(null);

  // Filter internal sirkulasi
  const [filterStatusSirkulasi, setFilterStatusSirkulasi] = useState<"semua" | "aktif" | "terlambat" | "selesai">("semua");
  const [cariTeks, setCariTeks] = useState("");

  const muatLaporan = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dariTanggal) params.set("dari", dariTanggal);
      if (sampaiTanggal) params.set("sampai", sampaiTanggal);

      const res = await fetch(`/api/v1/admin/laporan?${params.toString()}`);
      const json = await res.json();
      if (json.sukses) {
        setDataLaporan(json.data);
      }
    } catch (e) {
      console.error("Gagal memuat laporan:", e);
    } finally {
      setLoading(false);
    }
  }, [dariTanggal, sampaiTanggal]);

  useEffect(() => {
    muatLaporan();
  }, [muatLaporan]);

  // Ekspor Riwayat Sirkulasi ke format CSV
  const handleEksporSirkulasiCsv = () => {
    if (!dataLaporan?.sirkulasi) return;

    const headers = [
      "ID",
      "Tanggal Pinjam",
      "Jatuh Tempo",
      "Tanggal Kembali",
      "Status",
      "Nomor Induk",
      "Nama Siswa",
      "Kelas",
      "Kode Eksemplar",
      "Judul Buku",
      "Penulis",
      "Denda (Rp)",
    ];

    const barisData = dataLaporan.sirkulasi.map((s: any) => [
      s.id,
      new Date(s.dipinjamPada).toLocaleDateString("id-ID"),
      new Date(s.jatuhTempo).toLocaleDateString("id-ID"),
      s.dikembalikanPada ? new Date(s.dikembalikanPada).toLocaleDateString("id-ID") : "-",
      s.isAktif ? (s.terlambat ? "Terlambat" : "Aktif Dipinjam") : "Selesai Dikembalikan",
      `"${s.nomorInduk}"`,
      `"${s.namaAnggota}"`,
      `"${s.kelas || "Umum"}"`,
      s.kodeEksemplar,
      `"${s.judulBuku.replace(/"/g, '""')}"`,
      `"${s.penulis.replace(/"/g, '""')}"`,
      s.estimasiDendaRp || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...barisData.map((e: any) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Laporan_Sirkulasi_BilikBaca_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ekspor Rekap Kunjungan Kiosk ke CSV
  const handleEksporKunjunganCsv = () => {
    if (!dataLaporan?.kunjunganKelas) return;

    const headers = ["Nama Kelas", "Total Kunjungan Siswa"];
    const barisData = dataLaporan.kunjunganKelas.map((k: any) => [
      `"${k.namaKelas}"`,
      k.totalKunjungan,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...barisData.map((e: any) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Rekap_Kunjungan_Kelas_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter sirkulasi
  const sirkulasiTerfilter = (dataLaporan?.sirkulasi || []).filter((item: any) => {
    if (filterStatusSirkulasi === "aktif" && !item.isAktif) return false;
    if (filterStatusSirkulasi === "terlambat" && !item.terlambat) return false;
    if (filterStatusSirkulasi === "selesai" && item.isAktif) return false;

    if (cariTeks.trim()) {
      const q = cariTeks.toLowerCase();
      return (
        item.namaAnggota.toLowerCase().includes(q) ||
        item.nomorInduk.toLowerCase().includes(q) ||
        item.judulBuku.toLowerCase().includes(q) ||
        item.kodeEksemplar.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1440px]">
      {/* Header Laporan */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4 print:hidden">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">
            Pusat Laporan & Rekapitulasi
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Laporan riwayat peminjaman, statistik kehadiran siswa per kelas, dan peringkat koleksi terpopuler.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold min-h-[44px]"
          >
            <Printer className="w-4 h-4 text-ink-muted" />
            <span>Cetak Lembar Laporan</span>
          </button>

          {tabAktif === "sirkulasi" ? (
            <button
              onClick={handleEksporSirkulasiCsv}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-ink text-paper text-xs font-semibold hover:bg-ink/90 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor CSV Sirkulasi</span>
            </button>
          ) : (
            <button
              onClick={handleEksporKunjunganCsv}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-ink text-paper text-xs font-semibold hover:bg-ink/90 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor CSV Kunjungan</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tanggal & Tab Pilihan */}
      <div className="bg-surface border border-line rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        {/* Tab Pilihan */}
        <div className="flex items-center p-1 rounded-lg bg-paper-sunken/50 border border-line">
          <button
            onClick={() => setTabAktif("sirkulasi")}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all min-h-[36px] ${
              tabAktif === "sirkulasi" ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            Riwayat Sirkulasi ({dataLaporan?.sirkulasi?.length || 0})
          </button>
          <button
            onClick={() => setTabAktif("kunjungan")}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all min-h-[36px] ${
              tabAktif === "kunjungan" ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            Rekap Kunjungan Siswa
          </button>
          <button
            onClick={() => setTabAktif("peringkat")}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all min-h-[36px] ${
              tabAktif === "peringkat" ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            Peringkat & Statistik
          </button>
        </div>

        {/* Filter Tanggal Periode */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-ink-muted font-medium">Periode:</span>
          <input
            type="date"
            value={dariTanggal}
            onChange={(e) => setDariTanggal(e.target.value)}
            className="px-2.5 py-1.5 rounded border border-line font-mono bg-white text-xs"
          />
          <span className="text-ink-muted">s/d</span>
          <input
            type="date"
            value={sampaiTanggal}
            onChange={(e) => setSampaiTanggal(e.target.value)}
            className="px-2.5 py-1.5 rounded border border-line font-mono bg-white text-xs"
          />
          {(dariTanggal || sampaiTanggal) && (
            <button
              onClick={() => {
                setDariTanggal("");
                setSampaiTanggal("");
              }}
              className="text-xs text-danger hover:underline ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Kop Cetak Kedinasan Resmi (Hanya Muncul Saat window.print) */}
      <div className="hidden print:block border-b-4 border-double border-black pb-4 mb-6 text-center">
        <h2 className="font-serif font-extrabold text-2xl uppercase tracking-wider text-black">
          PERPUSTAKAAN SEKOLAH &ldquo;NETRI&rdquo;
        </h2>
        <p className="text-xs text-black font-medium mt-0.5">
          Unit Pelaksana Teknis Pengelolaan Arsip, Koleksi Buku, dan Sirkulasi Siswa
        </p>
        <p className="font-mono text-[10px] text-gray-700 mt-1">
          Laporan: {tabAktif === "sirkulasi" ? "Rekapitulasi Transaksi Sirkulasi Koleksi" : tabAktif === "kunjungan" ? "Rekapitulasi Presensi Kunjungan Kiosk" : "Statistik Koleksi & Peringkat Pembaca"}
          {dariTanggal || sampaiTanggal ? ` • Periode: ${dariTanggal || "Awal"} s/d ${sampaiTanggal || "Sekarang"}` : " • Periode: Seluruh Data Aktif"}
        </p>
        <p className="font-mono text-[9px] text-gray-500 mt-0.5">
          Dokumen Resmi • Dicetak pada: {new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RIWAYAT SIRKULASI                                                  */}
      {/* ========================================================================= */}
      {tabAktif === "sirkulasi" && (
        <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
          {/* Sub Toolbar Sirkulasi */}
          <div className="px-6 py-4 border-b border-line flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-base text-ink">Buku Keluar & Masuk</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-paper-sunken font-mono text-xs text-ink-muted">
                {sirkulasiTerfilter.length} Transaksi
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Cari Transaksi */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cariTeks}
                  onChange={(e) => setCariTeks(e.target.value)}
                  placeholder="Cari siswa, NIS, buku, kode..."
                  className="pl-8 pr-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[36px] w-64"
                />
              </div>

              {/* Filter Status */}
              <select
                value={filterStatusSirkulasi}
                onChange={(e: any) => setFilterStatusSirkulasi(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[36px]"
              >
                <option value="semua">Semua Status</option>
                <option value="aktif">Sedang Dipinjam</option>
                <option value="terlambat">Terlambat Saja</option>
                <option value="selesai">Selesai Dikembalikan</option>
              </select>
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
                  <th className="py-3 px-4">Tgl Kembali</th>
                  <th className="py-3 px-4">Status & Denda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-ink-muted font-mono">
                      Memuat data laporan sirkulasi...
                    </td>
                  </tr>
                ) : sirkulasiTerfilter.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-ink-muted">
                      Tidak ada transaksi sirkulasi yang sesuai dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  sirkulasiTerfilter.map((item: any) => (
                    <tr key={item.id} className="hover:bg-paper-sunken/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-ink">{item.kodeEksemplar}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-ink leading-tight">{item.judulBuku}</div>
                        <div className="text-[11px] text-ink-muted">{item.penulis}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-ink">{item.namaAnggota}</div>
                        <div className="font-mono text-[11px] text-ink-muted">
                          {item.nomorInduk} • {item.kelas || "Umum"}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-ink-muted">
                        {new Date(item.dipinjamPada).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className={item.terlambat ? "text-danger font-bold" : "text-ink"}>
                          {new Date(item.jatuhTempo).toLocaleDateString("id-ID")}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-ink-muted">
                        {item.dikembalikanPada
                          ? new Date(item.dikembalikanPada).toLocaleDateString("id-ID")
                          : "-"}
                      </td>
                      <td className="py-3 px-4">
                        {item.isAktif ? (
                          item.terlambat ? (
                            <div>
                              <span className="inline-block px-2 py-0.5 rounded bg-danger/10 text-danger font-mono font-bold text-[10px]">
                                Terlambat {item.selisihHari} hr
                              </span>
                              {item.estimasiDendaRp > 0 && (
                                <div className="font-mono text-[11px] text-danger mt-0.5 font-semibold">
                                  Denda: Rp {item.estimasiDendaRp.toLocaleString("id-ID")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded bg-status-dipinjam/10 text-status-dipinjam font-mono font-bold text-[10px]">
                              Aktif Dipinjam
                            </span>
                          )
                        ) : (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded bg-status-tersedia/10 text-status-tersedia font-mono font-bold text-[10px]">
                              Selesai
                            </span>
                            {Number(item.dendaRp || 0) > 0 && (
                              <div className="font-mono text-[10px] text-ink-muted mt-0.5">
                                Denda dibayar: Rp {Number(item.dendaRp).toLocaleString("id-ID")}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REKAP KUNJUNGAN KIOSK                                              */}
      {/* ========================================================================= */}
      {tabAktif === "kunjungan" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Rekap Per Kelas (7 Kolom) */}
          <div className="md:col-span-7 bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-ink">
                Kehadiran Kiosk Berdasarkan Kelas
              </h3>
              <span className="font-mono text-xs text-ink-muted">Akumulasi Total</span>
            </div>

            <div className="divide-y divide-line/60">
              {(dataLaporan?.kunjunganKelas || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-muted">
                  Belum ada data kunjungan kiosk tercatat.
                </div>
              ) : (
                dataLaporan.kunjunganKelas.map((item: any, idx: number) => (
                  <div key={item.namaKelas} className="px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-ink-muted w-6">
                        #{idx + 1}
                      </span>
                      <span className="font-serif font-bold text-sm text-ink">
                        Kelas {item.namaKelas}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-status-tersedia bg-status-tersedia/10 px-3 py-1 rounded-full">
                      {item.totalKunjungan} Siswa Hadir
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tren Kunjungan Harian (5 Kolom) */}
          <div className="md:col-span-5 bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-group-hiburan" />
                <span>Tren Kunjungan 7 Hari Terakhir</span>
              </h3>
            </div>

            <div className="space-y-3">
              {(dataLaporan?.trenKunjungan || []).map((t: any) => (
                <div key={t.tanggal} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-ink">{t.tanggal}</span>
                    <strong className="text-status-tersedia">{t.total} Siswa</strong>
                  </div>
                  <div className="w-full bg-paper-sunken h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-status-tersedia h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(10, (t.total / 50) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PERINGKAT & STATISTIK                                              */}
      {/* ========================================================================= */}
      {tabAktif === "peringkat" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* 10 Buku Terpopuler */}
          <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-line flex items-center gap-2">
              <Award className="w-5 h-5 text-group-hiburan" />
              <h3 className="font-serif font-bold text-base text-ink">
                10 Buku Paling Sering Dipinjam
              </h3>
            </div>

            <div className="divide-y divide-line/60">
              {(dataLaporan?.bukuPopuler || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-muted">Belum ada data peminjaman buku.</div>
              ) : (
                dataLaporan.bukuPopuler.map((b: any, idx: number) => (
                  <div key={b.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-paper-sunken flex items-center justify-center font-mono font-bold text-xs text-ink">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-serif font-bold text-sm text-ink leading-tight">{b.judul}</h4>
                        <p className="text-xs text-ink-muted">{b.penulis}</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-ink shrink-0 bg-paper-sunken px-2.5 py-1 rounded">
                      {b.totalPinjam}x Dipinjam
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 10 Siswa Teraktif */}
          <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-line flex items-center gap-2">
              <Users className="w-5 h-5 text-group-pelajaran" />
              <h3 className="font-serif font-bold text-base text-ink">
                10 Siswa Pembaca Teraktif
              </h3>
            </div>

            <div className="divide-y divide-line/60">
              {(dataLaporan?.siswaAktif || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-muted">Belum ada aktivitas siswa.</div>
              ) : (
                dataLaporan.siswaAktif.map((s: any, idx: number) => (
                  <div key={s.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-paper-sunken flex items-center justify-center font-mono font-bold text-xs text-ink">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-serif font-bold text-sm text-ink leading-tight">{s.nama}</h4>
                        <p className="font-mono text-xs text-ink-muted">
                          NIS: {s.nomorInduk} • Kelas: {s.kelas || "Umum"}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-status-tersedia shrink-0 bg-status-tersedia/10 px-2.5 py-1 rounded">
                      {s.totalPinjam} Buku
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Kolom Pengesahan Tanda Tangan Resmi (Hanya Muncul Saat window.print) */}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-8 mt-6 border-t-2 border-black text-center text-xs break-inside-avoid">
        <div>
          <p className="text-gray-700">Mengetahui,</p>
          <p className="font-bold text-black">Kepala Sekolah</p>
          <div className="h-20" />
          <p className="font-bold border-b border-black inline-block min-w-[200px] text-black">
            (......................................................)
          </p>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">NIP. ........................................</p>
        </div>
        <div>
          <p className="text-gray-700">Penanggung Jawab,</p>
          <p className="font-bold text-black">Kepala Perpustakaan NETRI</p>
          <div className="h-20" />
          <p className="font-bold border-b border-black inline-block min-w-[200px] text-black">
            (......................................................)
          </p>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">NIP. ........................................</p>
        </div>
      </div>
    </div>
  );
}
