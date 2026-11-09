"use client";

/**
 * Perpustakaan NETRI - Dashboard Analitik & Komando Eksekutif (Monitor 1 Admin)
 * Menyajikan ringkasan komposit, grafik statistik kunjungan & peminjaman tiap bulan (12 bulan),
 * tren harian (14 hari), komposisi koleksi, papan peringkat literasi sekolah,
 * dan sinkronisasi real-time otomatis dari Kiosk Presensi (Monitor 2).
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Clock,
  AlertTriangle,
  ArrowRight,
  Repeat,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Calendar,
  Award,
  TrendingUp,
  Layers,
  RefreshCw,
  UserCheck,
  Sparkles,
  GraduationCap,
} from "lucide-react";

export default function AdminDashboardPage() {
  const tahunSekarang = new Date().getFullYear();
  const [tahun, setTahun] = useState<number>(tahunSekarang);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [modeGrafik, setModeGrafik] = useState<"bulanan" | "harian">("bulanan");
  const [tabFeed, setTabFeed] = useState<"sirkulasi" | "kunjungan">("sirkulasi");
  const [terakhirSinkron, setTerakhirSinkron] = useState<string>("");

  const muatDashboard = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/v1/admin/dashboard?tahun=${tahun}`, {
          cache: "no-store",
        });
        if (res.status === 401) {
          window.location.href = "/admin/login?alihkan=/admin";
          return;
        }
        const json = await res.json();
        if (json.sukses && json.data) {
          setData(json.data);
          setTerakhirSinkron(
            new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          );
        }
      } catch (err) {
        console.error("Gagal memuat analitik dashboard:", err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [tahun]
  );

  useEffect(() => {
    muatDashboard(false);
  }, [muatDashboard]);

  // Sinkronisasi Real-Time Lintas Layar (Monitor 2 Kiosk -> Monitor 1 Admin)
  useEffect(() => {
    const handlePwaMutation = () => {
      muatDashboard(true);
    };
    window.addEventListener("netri:data-mutated", handlePwaMutation);
    return () => window.removeEventListener("netri:data-mutated", handlePwaMutation);
  }, [muatDashboard]);

  const ringkasan = data?.ringkasan || {
    totalJudulBuku: 0,
    totalEksemplar: 0,
    eksemplarTersedia: 0,
    eksemplarDipinjam: 0,
    eksemplarRusak: 0,
    eksemplarHilang: 0,
    totalAnggotaAktif: 0,
    anggotaSiswa: 0,
    anggotaGuruStaf: 0,
    totalKelas: 0,
    kunjunganHariIni: 0,
    kunjunganMingguIni: 0,
    kunjunganBulanIni: 0,
    kunjunganTahunIni: 0,
    sedangDipinjam: 0,
    terlambatAktif: 0,
    pinjamBulanIni: 0,
    kembaliBulanIni: 0,
    totalTransaksiTahunIni: 0,
    tingkatTepatWaktuPersen: 100,
    totalDendaTerkumpulRp: 0,
  };

  const statistikBulanan: any[] = data?.statistikBulanan || [];
  const statistikHarian: any[] = data?.statistikHarian || [];
  const komposisi = data?.komposisiKoleksi || {
    kelompok: { pelajaran: { judul: 0, eksemplar: 0 }, hiburan: { judul: 0, eksemplar: 0 } },
    perKategori: [],
  };
  const peringkat = data?.peringkatLiterasi || {
    topBuku: [],
    topSiswa: [],
    topKelas: [],
  };
  const operasional = data?.operasional || {
    pinjamanTerlambat: [],
    sirkulasiTerbaru: [],
    kunjunganTerbaru: [],
  };

  // Analitik Grafik Bulanan (Nilai Maksimum, Bulan Puncak, Rata-rata)
  const infoGrafikBulanan = useMemo(() => {
    if (!statistikBulanan.length) {
      return { maksNilai: 10, bulanPuncak: "-", totalKunjungan: 0, totalPinjam: 0, rataBulanan: 0 };
    }
    let maksNilai = 5;
    let bulanPuncakObj = statistikBulanan[0];
    let totalKunjungan = 0;
    let totalPinjam = 0;

    for (const item of statistikBulanan) {
      totalKunjungan += item.kunjungan;
      totalPinjam += item.peminjaman;
      if (item.kunjungan > maksNilai) maksNilai = item.kunjungan;
      if (item.peminjaman > maksNilai) maksNilai = item.peminjaman;
      if (item.kunjungan > (bulanPuncakObj?.kunjungan || 0)) {
        bulanPuncakObj = item;
      }
    }

    const bulanBerjalan = tahun === tahunSekarang ? new Date().getMonth() + 1 : 12;
    const rataBulanan = Math.round(totalKunjungan / Math.max(1, bulanBerjalan));

    return {
      maksNilai,
      bulanPuncak:
        bulanPuncakObj && bulanPuncakObj.kunjungan > 0
          ? `${bulanPuncakObj.namaLengkap} (${bulanPuncakObj.kunjungan})`
          : "Belum ada data",
      totalKunjungan,
      totalPinjam,
      rataBulanan,
    };
  }, [statistikBulanan, tahun, tahunSekarang]);

  // Analitik Grafik Harian (14 Hari)
  const maksGrafikHarian = useMemo(() => {
    let m = 5;
    for (const h of statistikHarian) {
      if (h.kunjungan > m) m = h.kunjungan;
      if (h.peminjaman > m) m = h.peminjaman;
    }
    return m;
  }, [statistikHarian]);

  const totalEksemplarKomposisi = Math.max(
    1,
    (komposisi.kelompok?.pelajaran?.eksemplar || 0) + (komposisi.kelompok?.hiburan?.eksemplar || 0)
  );
  const persenPelajaran = Math.round(
    ((komposisi.kelompok?.pelajaran?.eksemplar || 0) / totalEksemplarKomposisi) * 100
  );
  const persenHiburan = 100 - persenPelajaran;

  return (
    <div className="space-y-7 max-w-[1440px] pb-8">
      {/* ========================================================================= */}
      {/* 1. HEADER KOMANDO EKSEKUTIF & FILTER TAHUN ANALITIK                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-3xl font-semibold text-ink">
              Dashboard Analitik Perpustakaan NETRI
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-tersedia/10 text-status-tersedia font-mono text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-status-tersedia animate-pulse" />
              Live Sync Aktif
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Pusat pemantauan statistik kunjungan bulanan, sirkulasi koleksi, peringkat literasi siswa, dan peringatan keterlambatan.
            {terakhirSinkron && (
              <span className="font-mono text-[11px] ml-2 text-ink-muted/80">
                (Diperbarui {terakhirSinkron} WIB)
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pemilih Tahun Statistik */}
          <div className="inline-flex items-center gap-2 bg-surface border border-line rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-ink-muted" />
            <span className="text-xs font-medium text-ink-muted">Tahun Statistik:</span>
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="bg-transparent font-mono text-xs font-bold text-ink focus:outline-none cursor-pointer"
            >
              {[tahunSekarang, tahunSekarang - 1, tahunSekarang - 2].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => muatDashboard(false)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold transition-colors min-h-[40px] btn-tactile"
            title="Segarkan Data Dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>

          <Link
            href="/admin/laporan"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold transition-colors min-h-[40px]"
          >
            <span>Pusat Laporan</span>
          </Link>

          <Link
            href="/admin/sirkulasi"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 transition-colors min-h-[40px] btn-tactile"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Meja Sirkulasi</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EMPAT KARTU KPI KOMPOSIT (DENGAN SUB-RINCIAN LENGKAP)                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Kartu 1: Kunjungan Kiosk */}
        <div className="bg-surface border border-line rounded-xl p-5 shadow-sm flex flex-col justify-between gap-3 hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Kunjungan Kiosk
            </span>
            <div className="w-8 h-8 rounded-lg bg-status-tersedia/10 text-status-tersedia flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-mono text-3xl font-bold text-status-tersedia tabular-nums">
                {ringkasan.kunjunganHariIni}
              </div>
              <span className="text-[11px] text-ink-muted font-medium">Pengunjung Hari Ini</span>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-ink tabular-nums">
                {ringkasan.kunjunganBulanIni}
              </div>
              <span className="text-[11px] text-ink-muted">Bulan Ini</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-line/70 flex items-center justify-between text-[11px] font-mono text-ink-muted">
            <span>Minggu Ini: <strong className="text-ink">{ringkasan.kunjunganMingguIni}</strong></span>
            <span>Tahun {tahun}: <strong className="text-ink">{ringkasan.kunjunganTahunIni}</strong></span>
          </div>
        </div>

        {/* Kartu 2: Sirkulasi & Peminjaman */}
        <div className="bg-surface border border-line rounded-xl p-5 shadow-sm flex flex-col justify-between gap-3 hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Sirkulasi Buku
            </span>
            <div className="w-8 h-8 rounded-lg bg-status-dipinjam/10 text-status-dipinjam flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-mono text-3xl font-bold text-status-dipinjam tabular-nums">
                {ringkasan.sedangDipinjam}
              </div>
              <span className="text-[11px] text-ink-muted font-medium">Sedang Dipinjam</span>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-ink tabular-nums">
                {ringkasan.pinjamBulanIni}
              </div>
              <span className="text-[11px] text-ink-muted">Pinjam Bulan Ini</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-line/70 flex items-center justify-between text-[11px] font-mono text-ink-muted">
            <span>Kembali Bln Ini: <strong className="text-status-tersedia">{ringkasan.kembaliBulanIni}</strong></span>
            <span>Total {tahun}: <strong className="text-ink">{ringkasan.totalTransaksiTahunIni}</strong></span>
          </div>
        </div>

        {/* Kartu 3: Koleksi & Kondisi Fisik Eksemplar */}
        <div className="bg-surface border border-line rounded-xl p-5 shadow-sm flex flex-col justify-between gap-3 hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Koleksi & Fisik
            </span>
            <div className="w-8 h-8 rounded-lg bg-group-pelajaran/10 text-group-pelajaran flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-mono text-3xl font-bold text-ink tabular-nums">
                {ringkasan.totalJudulBuku}
              </div>
              <span className="text-[11px] text-ink-muted font-medium">Judul Buku Aktif</span>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-ink tabular-nums">
                {ringkasan.totalEksemplar}
              </div>
              <span className="text-[11px] text-ink-muted">Total Eksemplar</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-line/70 flex items-center justify-between text-[11px] font-mono">
            <span className="text-status-tersedia font-semibold">
              Tersedia: {ringkasan.eksemplarTersedia}
            </span>
            <span className="text-ink-muted">
              Rusak/Hilang:{" "}
              <strong className="text-danger">
                {ringkasan.eksemplarRusak + ringkasan.eksemplarHilang}
              </strong>
            </span>
          </div>
        </div>

        {/* Kartu 4: Anggota & Kepatuhan Pengembalian */}
        <div className="bg-surface border border-line rounded-xl p-5 shadow-sm flex flex-col justify-between gap-3 hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Anggota & Kepatuhan
            </span>
            <div className="w-8 h-8 rounded-lg bg-group-hiburan/10 text-group-hiburan flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-mono text-3xl font-bold text-ink tabular-nums">
                {ringkasan.totalAnggotaAktif}
              </div>
              <span className="text-[11px] text-ink-muted font-medium">Anggota Aktif</span>
            </div>
            <div className="text-right">
              <div
                className={`font-mono text-lg font-bold tabular-nums ${
                  ringkasan.terlambatAktif > 0 ? "text-danger" : "text-status-tersedia"
                }`}
              >
                {ringkasan.terlambatAktif}Buku
              </div>
              <span className="text-[11px] text-ink-muted">Terlambat Aktif</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-line/70 flex items-center justify-between text-[11px] font-mono text-ink-muted">
            <span>
              Siswa: <strong className="text-ink">{ringkasan.anggotaSiswa}</strong> ({ringkasan.totalKelas} Kls)
            </span>
            <span>
              Tepat Waktu: <strong className="text-status-tersedia">{ringkasan.tingkatTepatWaktuPersen}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. GRAFIK STATISTIK KUNJUNGAN BULANAN (12 BULAN) & KOMPOSISI KOLEKSI      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Panel Kiri (8 Kolom): Grafik Batang Ganda Bulanan & Harian */}
        <div className="lg:col-span-8 bg-surface border border-line rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-group-pelajaran" />
                  <h2 className="font-serif text-lg font-bold text-ink">
                    {modeGrafik === "bulanan"
                      ? `Statistik Kunjungan & Peminjaman Tiap Bulan (Tahun ${tahun})`
                      : "Tren Kunjungan & Peminjaman Harian (14 Hari Terakhir)"}
                  </h2>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  Perbandingan aktivitas kehadiran siswa di kiosk dengan jumlah transaksi peminjaman buku.
                </p>
              </div>

              {/* Pengalih Mode Grafik: Bulanan vs 14 Hari */}
              <div className="flex items-center p-1 rounded-lg bg-paper-sunken border border-line">
                <button
                  type="button"
                  onClick={() => setModeGrafik("bulanan")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    modeGrafik === "bulanan"
                      ? "bg-ink text-paper shadow-sm"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Tiap Bulan (12 Bln)
                </button>
                <button
                  type="button"
                  onClick={() => setModeGrafik("harian")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    modeGrafik === "harian"
                      ? "bg-ink text-paper shadow-sm"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Harian (14 Hari)
                </button>
              </div>
            </div>

            {/* Pita Ringkasan Analitik Bulanan */}
            <div className="grid grid-cols-3 gap-3 my-4 p-3.5 rounded-xl bg-paper/70 border border-line/80">
              <div>
                <span className="block text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                  Total Kunjungan {tahun}
                </span>
                <span className="font-mono text-lg font-bold text-status-tersedia">
                  {infoGrafikBulanan.totalKunjungan} Siswa
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                  Rata-Rata per Bulan
                </span>
                <span className="font-mono text-lg font-bold text-ink">
                  {infoGrafikBulanan.rataBulanan} Kunjungan
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                  Bulan Tertinggi (Peak)
                </span>
                <span className="font-serif text-sm font-bold text-group-pelajaran truncate block">
                  {infoGrafikBulanan.bulanPuncak}
                </span>
              </div>
            </div>

            {/* Area Visualisasi Grafik Batang Interaktif */}
            {modeGrafik === "bulanan" ? (
              <div className="pt-4 pb-2">
                <div className="h-56 flex items-end justify-between gap-2 sm:gap-3 px-2 border-b border-line pb-2">
                  {statistikBulanan.map((item) => {
                    const tinggiKunjungan = Math.max(
                      item.kunjungan > 0 ? 8 : 2,
                      Math.round((item.kunjungan / infoGrafikBulanan.maksNilai) * 180)
                    );
                    const tinggiPinjam = Math.max(
                      item.peminjaman > 0 ? 8 : 2,
                      Math.round((item.peminjaman / infoGrafikBulanan.maksNilai) * 180)
                    );
                    const isBulanIni =
                      tahun === tahunSekarang && item.bulan === new Date().getMonth() + 1;

                    return (
                      <div
                        key={item.bulan}
                        className="flex-1 flex flex-col items-center group relative"
                      >
                        {/* Tooltip Hover Detail Bulanan */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute -top-16 z-20 bg-ink text-paper px-2.5 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap shadow-lg">
                          <div className="font-bold text-white border-b border-white/20 pb-0.5 mb-0.5">
                            {item.namaLengkap} {tahun}
                          </div>
                          <div>Kunjungan: {item.kunjungan}</div>
                          <div>Dipinjam: {item.peminjaman}</div>
                        </div>

                        {/* Angka kecil di atas batang */}
                        <div className="h-4 flex items-center justify-center mb-1">
                          {(item.kunjungan > 0 || item.peminjaman > 0) && (
                            <span className="font-mono text-[9px] font-bold text-ink-muted group-hover:text-ink">
                              {item.kunjungan}
                            </span>
                          )}
                        </div>

                        {/* Pasangan Batang (Hijau: Kunjungan, Biru: Peminjaman) */}
                        <div className="w-full flex items-end justify-center gap-1 h-[180px]">
                          <div
                            style={{ height: `${tinggiKunjungan}px` }}
                            className={`w-2.5 sm:w-3.5 rounded-t transition-all duration-300 ${
                              item.kunjungan > 0
                                ? "bg-status-tersedia group-hover:brightness-110"
                                : "bg-line/60"
                            }`}
                          />
                          <div
                            style={{ height: `${tinggiPinjam}px` }}
                            className={`w-2.5 sm:w-3.5 rounded-t transition-all duration-300 ${
                              item.peminjaman > 0
                                ? "bg-group-pelajaran group-hover:brightness-110"
                                : "bg-line/40"
                            }`}
                          />
                        </div>

                        {/* Label Nama Bulan */}
                        <span
                          className={`mt-2 font-mono text-[10px] ${
                            isBulanIni
                              ? "font-extrabold text-group-hiburan underline underline-offset-4"
                              : "font-medium text-ink-muted"
                          }`}
                        >
                          {item.namaBulan}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="pt-4 pb-2">
                <div className="h-56 flex items-end justify-between gap-1.5 sm:gap-2 px-1 border-b border-line pb-2">
                  {statistikHarian.map((item) => {
                    const tinggiKunjungan = Math.max(
                      item.kunjungan > 0 ? 8 : 2,
                      Math.round((item.kunjungan / maksGrafikHarian) * 180)
                    );
                    const tinggiPinjam = Math.max(
                      item.peminjaman > 0 ? 8 : 2,
                      Math.round((item.peminjaman / maksGrafikHarian) * 180)
                    );

                    return (
                      <div
                        key={item.tanggal}
                        className="flex-1 flex flex-col items-center group relative"
                      >
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute -top-16 z-20 bg-ink text-paper px-2.5 py-1.5 rounded-lg text-[10px] font-mono whitespace-nowrap shadow-lg">
                          <div className="font-bold text-white border-b border-white/20 pb-0.5 mb-0.5">
                            {item.hari}, {item.label}
                          </div>
                          <div>Kunjungan: {item.kunjungan}</div>
                          <div>Dipinjam: {item.peminjaman}</div>
                        </div>

                        <div className="h-4 flex items-center justify-center mb-1">
                          {item.kunjungan > 0 && (
                            <span className="font-mono text-[9px] font-bold text-ink-muted">
                              {item.kunjungan}
                            </span>
                          )}
                        </div>

                        <div className="w-full flex items-end justify-center gap-0.5 h-[180px]">
                          <div
                            style={{ height: `${tinggiKunjungan}px` }}
                            className={`w-2 sm:w-3 rounded-t transition-all duration-300 ${
                              item.kunjungan > 0 ? "bg-status-tersedia" : "bg-line/60"
                            }`}
                          />
                          <div
                            style={{ height: `${tinggiPinjam}px` }}
                            className={`w-2 sm:w-3 rounded-t transition-all duration-300 ${
                              item.peminjaman > 0 ? "bg-group-pelajaran" : "bg-line/40"
                            }`}
                          />
                        </div>

                        <span className="mt-2 font-mono text-[9px] text-ink-muted truncate max-w-[36px]">
                          {item.label.split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Legenda Grafik */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 text-xs text-ink-muted">
            <div className="flex items-center gap-5">
              <span className="inline-flex items-center gap-2 font-medium">
                <span className="w-3 h-3 rounded-sm bg-status-tersedia inline-block" />
                Kunjungan Kiosk (Siswa/Guru)
              </span>
              <span className="inline-flex items-center gap-2 font-medium">
                <span className="w-3 h-3 rounded-sm bg-group-pelajaran inline-block" />
                Buku Dipinjam (Eksemplar)
              </span>
            </div>
            <span className="font-mono text-[11px]">
              Arahkan kursor ke batang grafik untuk rincian angka
            </span>
          </div>
        </div>

        {/* Panel Kanan (4 Kolom): Komposisi Koleksi & Distribusi Kategori */}
        <div className="lg:col-span-4 bg-surface border border-line rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="border-b border-line pb-3.5">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-group-hiburan" />
                <h2 className="font-serif text-lg font-bold text-ink">Komposisi Koleksi Rak</h2>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Proporsi Buku Pelajaran vs Bacaan Hiburan & kategori terbesar.
              </p>
            </div>

            {/* Bar Proporsi Pelajaran vs Hiburan */}
            <div className="p-3.5 rounded-xl bg-paper/70 border border-line/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-group-pelajaran">
                  Pelajaran ({persenPelajaran}%)
                </span>
                <span className="text-group-hiburan">
                  Hiburan ({persenHiburan}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden bg-paper-sunken flex">
                <div
                  style={{ width: `${persenPelajaran}%` }}
                  className="bg-group-pelajaran h-full transition-all"
                />
                <div
                  style={{ width: `${persenHiburan}%` }}
                  className="bg-group-hiburan h-full transition-all"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
                <span>
                  {komposisi.kelompok?.pelajaran?.judul || 0} Judul ({komposisi.kelompok?.pelajaran?.eksemplar || 0} Eks)
                </span>
                <span>
                  {komposisi.kelompok?.hiburan?.judul || 0} Judul ({komposisi.kelompok?.hiburan?.eksemplar || 0} Eks)
                </span>
              </div>
            </div>

            {/* Daftar 6 Kategori Terbesar */}
            <div className="space-y-2.5">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted font-semibold">
                Distribusi per Kategori Buku:
              </span>
              {komposisi.perKategori.length === 0 ? (
                <p className="text-xs text-ink-muted py-4 text-center">Belum ada kategori buku.</p>
              ) : (
                komposisi.perKategori.map((kat: any) => (
                  <div
                    key={kat.id}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-line/50 last:border-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          kat.kelompok === "pelajaran" ? "bg-group-pelajaran" : "bg-group-hiburan"
                        }`}
                      />
                      <span className="font-medium text-ink truncate">{kat.nama}</span>
                    </div>
                    <div className="font-mono text-[11px] text-ink-muted shrink-0">
                      <strong className="text-ink">{kat.jumlahJudul}</strong> jdl •{" "}
                      <span className="text-status-tersedia font-semibold">{kat.tersedia}</span>/{kat.jumlahEksemplar} eks
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            href="/admin/buku"
            className="w-full py-2.5 px-4 rounded-lg border border-line bg-paper hover:bg-paper-sunken text-ink text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Kelola Katalog & Eksemplar Buku</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PAPAN PERINGKAT LITERASI SEKOLAH (TOP BUKU, TOP SISWA, TOP KELAS)      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1: Top 5 Buku Paling Sering Dipinjam */}
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-group-hiburan" />
                <h3 className="font-serif font-bold text-base text-ink">
                  Top 5 Buku Terpopuler
                </h3>
              </div>
              <span className="font-mono text-[10px] uppercase bg-paper-sunken px-2 py-0.5 rounded text-ink-muted">
                Paling Diminati
              </span>
            </div>

            <div className="space-y-3">
              {peringkat.topBuku.length === 0 ? (
                <p className="text-xs text-ink-muted py-6 text-center">
                  Belum ada data peminjaman buku.
                </p>
              ) : (
                peringkat.topBuku.map((b: any, idx: number) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-paper/60 border border-line/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? "bg-group-hiburan text-white"
                            : idx === 1
                            ? "bg-group-pelajaran text-white"
                            : "bg-paper-sunken text-ink-muted"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-serif font-semibold text-xs sm:text-sm text-ink truncate">
                          {b.judul}
                        </h4>
                        <p className="text-[11px] text-ink-muted truncate">
                          {b.penulis} • {b.kategoriNama}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-surface border border-line text-ink">
                      {b.totalDipinjam}x
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Kolom 2: Top 5 Duta Literasi Siswa */}
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-status-tersedia" />
                <h3 className="font-serif font-bold text-base text-ink">
                  Top 5 Duta Literasi Siswa
                </h3>
              </div>
              <span className="font-mono text-[10px] uppercase bg-status-tersedia/10 px-2 py-0.5 rounded text-status-tersedia font-semibold">
                Siswa Teraktif
              </span>
            </div>

            <div className="space-y-3">
              {peringkat.topSiswa.length === 0 ? (
                <p className="text-xs text-ink-muted py-6 text-center">
                  Belum ada data aktivitas anggota.
                </p>
              ) : (
                peringkat.topSiswa.map((s: any, idx: number) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-paper/60 border border-line/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? "bg-status-tersedia text-white"
                            : idx === 1
                            ? "bg-ink text-paper"
                            : "bg-paper-sunken text-ink-muted"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-medium text-xs sm:text-sm text-ink truncate">
                          {s.nama}
                        </h4>
                        <p className="font-mono text-[11px] text-ink-muted truncate">
                          {s.kelas || "Umum"} • NIS: {s.nomorInduk}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px] shrink-0">
                      <span className="block font-bold text-status-tersedia">
                        {s.totalKunjungan} hadir
                      </span>
                      <span className="block text-ink-muted">{s.totalPinjam} pinjam</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Kolom 3: Top 5 Kelas Paling Rajin ke Perpustakaan */}
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-group-pelajaran" />
                <h3 className="font-serif font-bold text-base text-ink">
                  Top 5 Kelas Teraktif
                </h3>
              </div>
              <span className="font-mono text-[10px] uppercase bg-group-pelajaran/10 px-2 py-0.5 rounded text-group-pelajaran font-semibold">
                Partisipasi Kelas
              </span>
            </div>

            <div className="space-y-3">
              {peringkat.topKelas.length === 0 ? (
                <p className="text-xs text-ink-muted py-6 text-center">
                  Belum ada data kelas terdaftar.
                </p>
              ) : (
                peringkat.topKelas.map((k: any, idx: number) => (
                  <div
                    key={k.kelas}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-paper/60 border border-line/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? "bg-group-pelajaran text-white"
                            : "bg-paper-sunken text-ink-muted"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-mono font-bold text-xs sm:text-sm text-ink truncate">
                          Kelas {k.kelas}
                        </h4>
                        <p className="text-[11px] text-ink-muted">
                          {k.jumlahAnggota} siswa terdaftar
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px] shrink-0">
                      <span className="block font-bold text-ink">
                        {k.totalKunjungan} kunjungan
                      </span>
                      <span className="block text-group-pelajaran font-semibold">
                        {k.totalPinjam} buku dipinjam
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. PANEL OPERASIONAL: PERINGATAN TERLAMBAT & LIVE FEED SIRKULASI/KIOSK    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri (6 Kolom): Peringatan Keterlambatan Pinjaman */}
        <div className="lg:col-span-6 bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <h3 className="font-serif font-bold text-base text-ink">
                Peringatan Pinjaman Terlambat ({operasional.pinjamanTerlambat.length})
              </h3>
            </div>
            <Link
              href="/admin/sirkulasi"
              className="text-xs text-ink-muted hover:text-ink font-medium inline-flex items-center gap-1"
            >
              <span>Tindak Lanjuti di Sirkulasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-line/60">
            {operasional.pinjamanTerlambat.length === 0 ? (
              <div className="p-8 text-center text-xs text-status-tersedia flex flex-col items-center gap-2">
                <CheckCircle2 className="w-7 h-7" />
                <span className="font-medium">
                  Semua peminjaman buku dalam batas waktu aman (tidak ada keterlambatan aktif).
                </span>
              </div>
            ) : (
              operasional.pinjamanTerlambat.map((item: any) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm text-ink truncate">{item.judulBuku}</h4>
                    <p className="font-mono text-xs text-ink-muted mt-0.5">
                      Peminjam: <strong className="text-ink">{item.namaAnggota}</strong> (
                      {item.kelas || "Umum"}) • Kode: {item.kodeEksemplar}
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded bg-danger/10 text-danger font-mono font-bold text-xs">
                    +{item.selisihHari} hari
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom Kanan (6 Kolom): Live Feed Sirkulasi & Kehadiran Kiosk */}
        <div className="lg:col-span-6 bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-3.5 border-b border-line flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-paper-sunken border border-line">
              <button
                type="button"
                onClick={() => setTabFeed("sirkulasi")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  tabFeed === "sirkulasi"
                    ? "bg-ink text-paper shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Sirkulasi Terbaru
              </button>
              <button
                type="button"
                onClick={() => setTabFeed("kunjungan")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  tabFeed === "kunjungan"
                    ? "bg-ink text-paper shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Presensi Kiosk Terbaru
              </button>
            </div>

            <Link
              href={tabFeed === "sirkulasi" ? "/admin/laporan" : "/kiosk"}
              className="text-xs text-ink-muted hover:text-ink font-medium inline-flex items-center gap-1"
            >
              <span>{tabFeed === "sirkulasi" ? "Lihat Laporan" : "Buka Layar Kiosk"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-line/60">
            {tabFeed === "sirkulasi" ? (
              operasional.sirkulasiTerbaru.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-muted">
                  Belum ada transaksi peminjaman tercatat.
                </div>
              ) : (
                operasional.sirkulasiTerbaru.map((item: any) => (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm text-ink truncate">{item.judulBuku}</h4>
                      <p className="font-mono text-xs text-ink-muted mt-0.5">
                        {item.namaAnggota} ({item.kelas || "Umum"}) • {item.kodeEksemplar}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        item.dikembalikanPada
                          ? "bg-status-tersedia/10 text-status-tersedia"
                          : "bg-status-dipinjam/10 text-status-dipinjam"
                      }`}
                    >
                      {item.dikembalikanPada ? "Dikembalikan" : "Dipinjam"}
                    </span>
                  </div>
                ))
              )
            ) : operasional.kunjunganTerbaru.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted">
                Belum ada presensi kehadiran siswa tercatat.
              </div>
            ) : (
              operasional.kunjunganTerbaru.map((kj: any) => (
                <div key={kj.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm text-ink truncate">{kj.namaAnggota}</h4>
                    <p className="font-mono text-xs text-ink-muted mt-0.5">
                      Kelas: {kj.kelas || "Umum"} • NIS: {kj.nomorInduk}
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-status-tersedia/10 text-status-tersedia font-mono text-[10px] font-bold">
                    {new Date(kj.waktu).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    WIB
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
