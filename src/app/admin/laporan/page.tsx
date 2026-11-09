"use client";

/**
 * Perpustakaan NETRI - Halaman Pusat Laporan, Rekapitulasi, & Peringkat Literasi
 * Menyediakan:
 * 1. Riwayat Sirkulasi Lengkap (filter status, kelas, pencarian, & ekspor CSV)
 * 2. Rekap Kunjungan Siswa:
 *    - Berdasarkan Kelas (total kunjungan, siswa unik, rasio partisipasi rombel, & tren harian)
 *    - Berdasarkan Siswa / Individu (rekap frekuensi kehadiran per siswa + log waktu presensi detail)
 * 3. Peringkat & Statistik Literasi:
 *    - Peringkat Buku Terpopuler (Paling Sering Dipinjam)
 *    - Peringkat Siswa Teraktif Berdasarkan Peminjaman Buku
 *    - Peringkat Siswa Teraktif Berdasarkan Kunjungan Perpustakaan
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Download,
  Printer,
  Calendar,
  Search,
  BookOpen,
  Users,
  Award,
  TrendingUp,
  Clock,
  UserCheck,
  School,
  QrCode,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const DAFTAR_BULAN = [
  { angka: "01", nama: "Januari" },
  { angka: "02", nama: "Februari" },
  { angka: "03", nama: "Maret" },
  { angka: "04", nama: "April" },
  { angka: "05", nama: "Mei" },
  { angka: "06", nama: "Juni" },
  { angka: "07", nama: "Juli" },
  { angka: "08", nama: "Agustus" },
  { angka: "09", nama: "September" },
  { angka: "10", nama: "Oktober" },
  { angka: "11", nama: "November" },
  { angka: "12", nama: "Desember" },
];

export default function AdminLaporanPage() {
  const [tabAktif, setTabAktif] = useState<"sirkulasi" | "kunjungan" | "peringkat">("sirkulasi");

  // Sub-mode pada Tab Rekap Kunjungan Siswa: Berdasarkan Kelas vs Berdasarkan Siswa
  const [modeKunjungan, setModeKunjungan] = useState<"kelas" | "siswa" | "log">("kelas");

  // Sub-mode pada Tab Peringkat & Statistik
  const [modePeringkat, setModePeringkat] = useState<
    "semua" | "buku" | "siswa_pinjam" | "siswa_kunjungan"
  >("semua");

  // Filter Periode (Rentang Tanggal & Pilihan Bulan Cepat)
  const [dariTanggal, setDariTanggal] = useState("");
  const [sampaiTanggal, setSampaiTanggal] = useState("");
  const [bulanCepat, setBulanCepat] = useState<string>("semua");
  const tahunSekarang = new Date().getFullYear();

  const [loading, setLoading] = useState(true);
  const [dataLaporan, setDataLaporan] = useState<any | null>(null);

  // Filter internal Sirkulasi
  const [filterStatusSirkulasi, setFilterStatusSirkulasi] = useState<
    "semua" | "aktif" | "terlambat" | "selesai"
  >("semua");
  const [filterKelasSirkulasi, setFilterKelasSirkulasi] = useState<string>("semua");
  const [cariTeks, setCariTeks] = useState("");

  // Filter internal Kunjungan Siswa
  const [filterKelasKunjungan, setFilterKelasKunjungan] = useState<string>("semua");
  const [cariKunjunganSiswa, setCariKunjunganSiswa] = useState("");

  // Filter internal Peringkat
  const [filterKelompokBuku, setFilterKelompokBuku] = useState<
    "semua" | "hiburan" | "pelajaran"
  >("semua");
  const [filterKelasPeringkat, setFilterKelasPeringkat] = useState<string>("semua");

  // Saat memilih Bulan Cepat (Januari - Desember), otomatis isi dariTanggal & sampaiTanggal
  const handlePilihBulanCepat = (kodeBulan: string) => {
    setBulanCepat(kodeBulan);
    if (kodeBulan === "semua") {
      setDariTanggal("");
      setSampaiTanggal("");
      return;
    }
    const blnNum = Number(kodeBulan);
    const hariTerakhir = new Date(tahunSekarang, blnNum, 0).getDate();
    setDariTanggal(`${tahunSekarang}-${kodeBulan}-01`);
    setSampaiTanggal(`${tahunSekarang}-${kodeBulan}-${String(hariTerakhir).padStart(2, "0")}`);
  };

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

  // Daftar kelas unik dari respons API
  const daftarKelasUnik: string[] = useMemo(() => {
    if (Array.isArray(dataLaporan?.daftarKelasTersedia) && dataLaporan.daftarKelasTersedia.length > 0) {
      return dataLaporan.daftarKelasTersedia;
    }
    const setKls = new Set<string>();
    for (const k of dataLaporan?.kunjunganKelas || []) {
      if (k.namaKelas) setKls.add(k.namaKelas);
    }
    return Array.from(setKls).sort();
  }, [dataLaporan]);

  // Filter Sirkulasi
  const sirkulasiTerfilter = useMemo(() => {
    return (dataLaporan?.sirkulasi || []).filter((item: any) => {
      if (filterStatusSirkulasi === "aktif" && !item.isAktif) return false;
      if (filterStatusSirkulasi === "terlambat" && !item.terlambat) return false;
      if (filterStatusSirkulasi === "selesai" && item.isAktif) return false;
      if (filterKelasSirkulasi !== "semua" && (item.kelas || "Umum") !== filterKelasSirkulasi) {
        return false;
      }

      if (cariTeks.trim()) {
        const q = cariTeks.toLowerCase();
        return (
          item.namaAnggota?.toLowerCase().includes(q) ||
          item.nomorInduk?.toLowerCase().includes(q) ||
          item.judulBuku?.toLowerCase().includes(q) ||
          item.kodeEksemplar?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dataLaporan, filterStatusSirkulasi, filterKelasSirkulasi, cariTeks]);

  // Filter Rekap Kunjungan Berdasarkan Siswa
  const kunjunganSiswaTerfilter = useMemo(() => {
    return (dataLaporan?.kunjunganSiswa || []).filter((item: any) => {
      if (filterKelasKunjungan !== "semua" && (item.kelas || "Umum") !== filterKelasKunjungan) {
        return false;
      }
      if (cariKunjunganSiswa.trim()) {
        const q = cariKunjunganSiswa.toLowerCase();
        return (
          item.nama?.toLowerCase().includes(q) ||
          item.nomorInduk?.toLowerCase().includes(q) ||
          (item.kelas || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dataLaporan, filterKelasKunjungan, cariKunjunganSiswa]);

  // Filter Log Detail Kehadiran Siswa
  const logKunjunganTerfilter = useMemo(() => {
    return (dataLaporan?.riwayatKunjungan || []).filter((item: any) => {
      if (filterKelasKunjungan !== "semua" && (item.kelas || "Umum") !== filterKelasKunjungan) {
        return false;
      }
      if (cariKunjunganSiswa.trim()) {
        const q = cariKunjunganSiswa.toLowerCase();
        return (
          item.nama?.toLowerCase().includes(q) ||
          item.nomorInduk?.toLowerCase().includes(q) ||
          (item.kelas || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dataLaporan, filterKelasKunjungan, cariKunjunganSiswa]);

  // Filter Peringkat Buku
  const bukuPopulerTerfilter = useMemo(() => {
    return (dataLaporan?.bukuPopuler || []).filter((b: any) => {
      if (filterKelompokBuku !== "semua" && b.kelompok !== filterKelompokBuku) return false;
      return true;
    });
  }, [dataLaporan, filterKelompokBuku]);

  // Filter Peringkat Siswa Berdasarkan Peminjaman Buku
  const siswaPinjamTerfilter = useMemo(() => {
    return (dataLaporan?.siswaAktifPinjam || dataLaporan?.siswaAktif || []).filter((s: any) => {
      if (filterKelasPeringkat !== "semua" && (s.kelas || "Umum") !== filterKelasPeringkat) {
        return false;
      }
      return true;
    });
  }, [dataLaporan, filterKelasPeringkat]);

  // Filter Peringkat Siswa Berdasarkan Kunjungan
  const siswaKunjunganTerfilter = useMemo(() => {
    return (dataLaporan?.siswaAktifKunjungan || []).filter((s: any) => {
      if (filterKelasPeringkat !== "semua" && (s.kelas || "Umum") !== filterKelasPeringkat) {
        return false;
      }
      return true;
    });
  }, [dataLaporan, filterKelasPeringkat]);

  // Nama Berkas Dinamis untuk Cetak PDF & Ekspor CSV
  const namaBerkasKonteks = useMemo(() => {
    const tgl = new Date().toISOString().slice(0, 10);
    const labelPeriode =
      bulanCepat !== "semua"
        ? `_${DAFTAR_BULAN.find((b) => b.angka === bulanCepat)?.nama || bulanCepat}_${tahunSekarang}`
        : dariTanggal || sampaiTanggal
        ? `_${dariTanggal || "Awal"}_sd_${sampaiTanggal || "Kini"}`
        : "";

    if (tabAktif === "sirkulasi") {
      return `Laporan_Sirkulasi_Buku${labelPeriode}_NETRI_${tgl}`;
    }
    if (tabAktif === "kunjungan") {
      if (modeKunjungan === "kelas") {
        return `Rekap_Kunjungan_Per_Kelas${labelPeriode}_NETRI_${tgl}`;
      }
      if (modeKunjungan === "siswa") {
        const kls = filterKelasKunjungan !== "semua" ? `_Kelas_${filterKelasKunjungan}` : "";
        return `Rekap_Kunjungan_Per_Siswa${kls}${labelPeriode}_NETRI_${tgl}`;
      }
      return `Log_Presensi_Kunjungan_Siswa${labelPeriode}_NETRI_${tgl}`;
    }
    return `Laporan_Peringkat_Buku_dan_Siswa_Teraktif${labelPeriode}_NETRI_${tgl}`;
  }, [tabAktif, modeKunjungan, filterKelasKunjungan, bulanCepat, dariTanggal, sampaiTanggal, tahunSekarang]);

  // Helper unduh CSV
  const unduhCsv = (headers: string[], rows: any[][], filename: string) => {
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ekspor CSV kontekstual sesuai tab & sub-mode aktif
  const handleEksporCsvAktif = () => {
    if (!dataLaporan) return;

    if (tabAktif === "sirkulasi") {
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
      const baris = sirkulasiTerfilter.map((s: any) => [
        s.id,
        new Date(s.dipinjamPada).toLocaleDateString("id-ID"),
        new Date(s.jatuhTempo).toLocaleDateString("id-ID"),
        s.dikembalikanPada ? new Date(s.dikembalikanPada).toLocaleDateString("id-ID") : "-",
        s.isAktif ? (s.terlambat ? "Terlambat" : "Aktif Dipinjam") : "Selesai Dikembalikan",
        `"${s.nomorInduk}"`,
        `"${(s.namaAnggota || "").replace(/"/g, '""')}"`,
        `"${s.kelas || "Umum"}"`,
        s.kodeEksemplar,
        `"${(s.judulBuku || "").replace(/"/g, '""')}"`,
        `"${(s.penulis || "").replace(/"/g, '""')}"`,
        s.estimasiDendaRp || 0,
      ]);
      unduhCsv(headers, baris, namaBerkasKonteks);
      return;
    }

    if (tabAktif === "kunjungan") {
      if (modeKunjungan === "kelas") {
        const headers = [
          "Peringkat",
          "Nama Kelas",
          "Total Kunjungan",
          "Siswa Unik Hadir",
          "Total Anggota Kelas",
          "Persentase Partisipasi (%)",
        ];
        const baris = (dataLaporan.kunjunganKelas || []).map((k: any, i: number) => [
          i + 1,
          `"${k.namaKelas}"`,
          k.totalKunjungan,
          k.siswaUnik || 0,
          k.jumlahAnggotaKelas || 0,
          `${k.persenPartisipasi || 0}%`,
        ]);
        unduhCsv(headers, baris, namaBerkasKonteks);
      } else if (modeKunjungan === "siswa") {
        const headers = [
          "No",
          "Nomor Induk (NIS)",
          "Nama Lengkap Siswa",
          "Kelas",
          "Total Kehadiran",
          "Scan QR",
          "Input Manual",
          "Total Buku Dipinjam",
          "Kunjungan Terakhir",
        ];
        const baris = kunjunganSiswaTerfilter.map((s: any, i: number) => [
          i + 1,
          `"${s.nomorInduk}"`,
          `"${(s.nama || "").replace(/"/g, '""')}"`,
          `"${s.kelas || "Umum"}"`,
          s.totalKunjungan,
          s.viaQr || 0,
          s.viaManual || 0,
          s.totalPinjamBuku || 0,
          s.kunjunganTerakhir ? new Date(s.kunjunganTerakhir).toLocaleString("id-ID") : "-",
        ]);
        unduhCsv(headers, baris, namaBerkasKonteks);
      } else {
        const headers = ["No", "Tanggal", "Jam WIB", "Nomor Induk", "Nama Siswa", "Kelas", "Metode"];
        const baris = logKunjunganTerfilter.map((l: any, i: number) => [
          i + 1,
          new Date(l.tanggal).toLocaleDateString("id-ID"),
          new Date(l.waktu).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          `"${l.nomorInduk}"`,
          `"${(l.nama || "").replace(/"/g, '""')}"`,
          `"${l.kelas || "Umum"}"`,
          l.metode === "qr" ? "Kartu QR" : "Ketik NIS",
        ]);
        unduhCsv(headers, baris, namaBerkasKonteks);
      }
      return;
    }

    // Tab Peringkat: Gabungkan Peringkat Buku, Siswa Peminjaman, dan Siswa Kunjungan dalam 1 CSV terstruktur
    const headers = [
      "Kategori Peringkat",
      "Peringkat",
      "Kode / NIS",
      "Judul Buku / Nama Siswa",
      "Penulis / Kelas",
      "Metrik Utama",
      "Keterangan Tambahan",
    ];
    const barisBuku = bukuPopulerTerfilter.map((b: any, i: number) => [
      "Peringkat Buku Terpopuler",
      i + 1,
      `"${b.lokasiRak || "-"}"`,
      `"${(b.judul || "").replace(/"/g, '""')}"`,
      `"${(b.penulis || "").replace(/"/g, '""')}"`,
      `${b.totalPinjam}x Dipinjam`,
      `"${b.peminjamUnik || 0} Siswa Peminjam"`,
    ]);
    const barisSiswaPinjam = siswaPinjamTerfilter.map((s: any, i: number) => [
      "Siswa Teraktif - Peminjaman Buku",
      i + 1,
      `"${s.nomorInduk}"`,
      `"${(s.nama || "").replace(/"/g, '""')}"`,
      `"Kelas ${s.kelas || "Umum"}"`,
      `${s.totalPinjam} Buku Dipinjam`,
      `"${s.totalKunjungan || 0}x Kunjungan Kiosk"`,
    ]);
    const barisSiswaKunjungan = siswaKunjunganTerfilter.map((s: any, i: number) => [
      "Siswa Teraktif - Kunjungan Kiosk",
      i + 1,
      `"${s.nomorInduk}"`,
      `"${(s.nama || "").replace(/"/g, '""')}"`,
      `"Kelas ${s.kelas || "Umum"}"`,
      `${s.totalKunjungan}x Hadir`,
      `"${s.totalPinjam || 0} Buku Dipinjam"`,
    ]);
    unduhCsv(
      headers,
      [...barisBuku, ...barisSiswaPinjam, ...barisSiswaKunjungan],
      namaBerkasKonteks
    );
  };

  // Cetak Laporan dengan Nama File PDF Dinamis
  const handleCetakLaporanPdf = () => {
    const judulAsli = document.title;
    document.title = namaBerkasKonteks;
    const kembalikanJudul = () => {
      document.title = judulAsli;
      window.removeEventListener("afterprint", kembalikanJudul);
    };
    window.addEventListener("afterprint", kembalikanJudul);
    window.print();
  };

  const bukuTeratas = bukuPopulerTerfilter[0] || null;
  const pembacaTeratas = siswaPinjamTerfilter[0] || null;
  const pengunjungTeratas = siswaKunjunganTerfilter[0] || null;
  const kelasTeratas = (dataLaporan?.kunjunganKelas || [])[0] || null;

  return (
    <div className="space-y-6 max-w-[1440px]">
      {/* Header Laporan */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4 print:hidden">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">
            Pusat Laporan, Rekapitulasi, & Peringkat
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Rekap sirkulasi buku, kehadiran siswa berdasarkan kelas & individu, serta peringkat buku & siswa teraktif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCetakLaporanPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold min-h-[44px]"
          >
            <Printer className="w-4 h-4 text-ink-muted" />
            <span>Cetak / Simpan PDF</span>
          </button>

          <button
            onClick={handleEksporCsvAktif}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-ink text-paper text-xs font-semibold hover:bg-ink/90 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>
              {tabAktif === "sirkulasi"
                ? "Ekspor CSV Sirkulasi"
                : tabAktif === "kunjungan"
                ? modeKunjungan === "kelas"
                  ? "Ekspor CSV Kunjungan Kelas"
                  : modeKunjungan === "siswa"
                  ? "Ekspor CSV Kunjungan Siswa"
                  : "Ekspor CSV Log Presensi"
                : "Ekspor CSV Peringkat"}
            </span>
          </button>
        </div>
      </div>

      {/* Kartu Ringkasan Eksekutif Sesuai Periode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex items-start justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted block">
              Total Sirkulasi Buku
            </span>
            <p className="font-serif text-2xl font-bold text-ink mt-1">
              {dataLaporan?.totalTransaksi || 0}{" "}
              <span className="text-xs font-sans font-normal text-ink-muted">Transaksi</span>
            </p>
            <span className="text-[11px] text-ink-muted block mt-1">
              {dataLaporan?.totalTerlambat || 0} pinjaman berstatus terlambat
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-group-pelajaran/10 text-group-pelajaran flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex items-start justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted block">
              Total Kunjungan Siswa
            </span>
            <p className="font-serif text-2xl font-bold text-status-tersedia mt-1">
              {dataLaporan?.totalKunjunganPeriode || 0}{" "}
              <span className="text-xs font-sans font-normal text-ink-muted">Kehadiran</span>
            </p>
            <span className="text-[11px] text-ink-muted block mt-1">
              Dari {dataLaporan?.totalSiswaUnikBerkunjung || 0} siswa unik yang hadir
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-status-tersedia/10 text-status-tersedia flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex items-start justify-between">
          <div className="min-w-0 pr-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted block">
              Kelas Paling Aktif
            </span>
            <p className="font-serif text-lg font-bold text-ink mt-1 truncate">
              {kelasTeratas ? `Kelas ${kelasTeratas.namaKelas}` : "Belum Ada Data"}
            </p>
            <span className="text-[11px] text-ink-muted block mt-1">
              {kelasTeratas
                ? `${kelasTeratas.totalKunjungan} kunjungan (${kelasTeratas.siswaUnik} siswa unik)`
                : "Menunggu presensi kiosk"}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-group-hiburan/10 text-group-hiburan flex items-center justify-center shrink-0">
            <School className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex items-start justify-between">
          <div className="min-w-0 pr-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted block">
              Siswa & Buku Terpopuler
            </span>
            <p className="font-serif text-sm font-bold text-ink mt-1 truncate">
              {pembacaTeratas
                ? `${pembacaTeratas.nama} (${pembacaTeratas.totalPinjam} Buku)`
                : pengunjungTeratas
                ? `${pengunjungTeratas.nama} (${pengunjungTeratas.totalKunjungan}x Hadir)`
                : "Belum Ada Aktivitas"}
            </p>
            <span className="text-[11px] text-ink-muted block mt-1 truncate">
              {bukuTeratas
                ? `Buku: ${bukuTeratas.judul} (${bukuTeratas.totalPinjam}x)`
                : "Menunggu transaksi sirkulasi"}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Tanggal, Bulan Cepat (Januari - Desember), & Tab Pilihan */}
      <div className="bg-surface border border-line rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        {/* Tab Pilihan Utama */}
        <div className="flex flex-wrap items-center p-1 rounded-lg bg-paper-sunken/50 border border-line">
          <button
            onClick={() => setTabAktif("sirkulasi")}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all min-h-[36px] ${
              tabAktif === "sirkulasi"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            1. Riwayat Sirkulasi ({dataLaporan?.sirkulasi?.length || 0})
          </button>
          <button
            onClick={() => setTabAktif("kunjungan")}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all min-h-[36px] ${
              tabAktif === "kunjungan"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            2. Rekap Kunjungan Siswa (Kelas & Individu)
          </button>
          <button
            onClick={() => setTabAktif("peringkat")}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all min-h-[36px] ${
              tabAktif === "peringkat"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            3. Peringkat & Statistik (Buku & Siswa)
          </button>
        </div>

        {/* Filter Periode: Pilihan Bulan Cepat + Tanggal Manual */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-ink-muted" />
            <select
              value={bulanCepat}
              onChange={(e) => handlePilihBulanCepat(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-line bg-white text-xs font-medium text-ink"
            >
              <option value="semua">Semua Bulan ({tahunSekarang})</option>
              {DAFTAR_BULAN.map((b) => (
                <option key={b.angka} value={b.angka}>
                  Bulan {b.nama} {tahunSekarang}
                </option>
              ))}
            </select>
          </div>

          <span className="text-ink-muted">|</span>

          <input
            type="date"
            value={dariTanggal}
            onChange={(e) => {
              setBulanCepat("semua");
              setDariTanggal(e.target.value);
            }}
            className="px-2.5 py-1.5 rounded border border-line font-mono bg-white text-xs"
          />
          <span className="text-ink-muted">s/d</span>
          <input
            type="date"
            value={sampaiTanggal}
            onChange={(e) => {
              setBulanCepat("semua");
              setSampaiTanggal(e.target.value);
            }}
            className="px-2.5 py-1.5 rounded border border-line font-mono bg-white text-xs"
          />
          {(dariTanggal || sampaiTanggal) && (
            <button
              onClick={() => {
                setBulanCepat("semua");
                setDariTanggal("");
                setSampaiTanggal("");
              }}
              className="text-xs text-danger hover:underline ml-1 font-medium"
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
          Laporan:{" "}
          {tabAktif === "sirkulasi"
            ? "Rekapitulasi Transaksi Sirkulasi Koleksi Buku"
            : tabAktif === "kunjungan"
            ? modeKunjungan === "kelas"
              ? "Rekapitulasi Presensi Kunjungan Siswa Berdasarkan Kelas"
              : modeKunjungan === "siswa"
              ? "Rekapitulasi Presensi Kunjungan Berdasarkan Siswa (Individu)"
              : "Daftar Log Kehadiran Harian Siswa"
            : "Laporan Peringkat Koleksi Buku Terpopuler & Siswa Teraktif (Peminjaman & Kunjungan)"}
          {dariTanggal || sampaiTanggal
            ? ` • Periode: ${dariTanggal || "Awal"} s/d ${sampaiTanggal || "Sekarang"}`
            : " • Periode: Seluruh Data Aktif"}
        </p>
        <p className="font-mono text-[9px] text-gray-500 mt-0.5">
          Dokumen Resmi • Dicetak pada:{" "}
          {new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RIWAYAT SIRKULASI                                                  */}
      {/* ========================================================================= */}
      {tabAktif === "sirkulasi" && (
        <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-base text-ink">
                Riwayat Peminjaman & Pengembalian Buku
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-paper-sunken font-mono text-xs text-ink-muted">
                {sirkulasiTerfilter.length} Transaksi
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cariTeks}
                  onChange={(e) => setCariTeks(e.target.value)}
                  placeholder="Cari siswa, NIS, buku, kode..."
                  className="pl-8 pr-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[36px] w-60"
                />
              </div>

              <select
                value={filterKelasSirkulasi}
                onChange={(e) => setFilterKelasSirkulasi(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[36px] font-mono"
              >
                <option value="semua">Semua Kelas</option>
                {daftarKelasUnik.map((kls) => (
                  <option key={kls} value={kls}>
                    Kelas {kls}
                  </option>
                ))}
              </select>

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
                      <td className="py-3 px-4 font-mono font-bold text-ink">
                        {item.kodeEksemplar}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-ink leading-tight">{item.judulBuku}</div>
                        <div className="text-[11px] text-ink-muted">{item.penulis}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-ink">{item.namaAnggota}</div>
                        <div className="font-mono text-[11px] text-ink-muted">
                          {item.nomorInduk} • Kelas {item.kelas || "Umum"}
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
                                Denda: Rp {Number(item.dendaRp).toLocaleString("id-ID")}
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
      {/* TAB 2: REKAP KUNJUNGAN SISWA (BERDASARKAN KELAS & BERDASARKAN SISWA)      */}
      {/* ========================================================================= */}
      {tabAktif === "kunjungan" && (
        <div className="space-y-6">
          {/* Sub-Navigasi Mode Kunjungan: Berdasarkan Kelas vs Berdasarkan Siswa vs Log Harian */}
          <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setModeKunjungan("kelas")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  modeKunjungan === "kelas"
                    ? "bg-ink text-paper shadow-xs"
                    : "bg-paper-sunken/70 text-ink-muted hover:text-ink"
                }`}
              >
                <School className="w-3.5 h-3.5" />
                <span>Rekap Berdasarkan Kelas ({dataLaporan?.kunjunganKelas?.length || 0} Kelas)</span>
              </button>

              <button
                type="button"
                onClick={() => setModeKunjungan("siswa")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  modeKunjungan === "siswa"
                    ? "bg-ink text-paper shadow-xs"
                    : "bg-paper-sunken/70 text-ink-muted hover:text-ink"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>
                  Rekap Berdasarkan Siswa ({dataLaporan?.kunjunganSiswa?.length || 0} Siswa)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModeKunjungan("log")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  modeKunjungan === "log"
                    ? "bg-ink text-paper shadow-xs"
                    : "bg-paper-sunken/70 text-ink-muted hover:text-ink"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Log Waktu Kedatangan ({dataLaporan?.riwayatKunjungan?.length || 0})</span>
              </button>
            </div>

            {/* Filter Pencarian & Kelas ketika di mode Berdasarkan Siswa / Log */}
            {(modeKunjungan === "siswa" || modeKunjungan === "log") && (
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={cariKunjunganSiswa}
                    onChange={(e) => setCariKunjunganSiswa(e.target.value)}
                    placeholder="Cari nama siswa atau NIS..."
                    className="pl-8 pr-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[36px] w-56"
                  />
                </div>

                <select
                  value={filterKelasKunjungan}
                  onChange={(e) => setFilterKelasKunjungan(e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[36px] font-mono"
                >
                  <option value="semua">Semua Kelas</option>
                  {daftarKelasUnik.map((kls) => (
                    <option key={kls} value={kls}>
                      Kelas {kls}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* MODE 2A: REKAP KUNJUNGAN BERDASARKAN KELAS */}
          {modeKunjungan === "kelas" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Tabel Lengkap Kunjungan Berdasarkan Kelas (8 Kolom) */}
              <div className="lg:col-span-8 bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-base text-ink">
                      Rekapitulasi Kehadiran Perpustakaan Berdasarkan Kelas
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Klik salah satu baris kelas untuk melihat rincian siswa yang hadir dari kelas tersebut.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-status-tersedia font-semibold bg-status-tersedia/10 px-2.5 py-1 rounded">
                    Total: {dataLaporan?.totalKunjunganPeriode || 0} Kunjungan
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-paper-sunken/60 font-sans text-[11px] font-semibold tracking-wider uppercase text-ink-muted border-b border-line">
                      <tr>
                        <th className="py-3 px-4 w-14">Rank</th>
                        <th className="py-3 px-4">Rombongan Kelas</th>
                        <th className="py-3 px-4 text-center">Total Kunjungan</th>
                        <th className="py-3 px-4 text-center">Siswa Unik Hadir</th>
                        <th className="py-3 px-4">Partisipasi Kelas</th>
                        <th className="py-3 px-4 text-right print:hidden">Detail Siswa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {(dataLaporan?.kunjunganKelas || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-ink-muted">
                            Belum ada data kunjungan kiosk tercatat pada periode ini.
                          </td>
                        </tr>
                      ) : (
                        dataLaporan.kunjunganKelas.map((item: any, idx: number) => (
                          <tr
                            key={item.namaKelas}
                            onClick={() => {
                              setFilterKelasKunjungan(item.namaKelas);
                              setModeKunjungan("siswa");
                            }}
                            className="hover:bg-paper-sunken/30 cursor-pointer transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-ink-muted">
                              #{idx + 1}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-serif font-bold text-sm text-ink">
                                Kelas {item.namaKelas}
                              </span>
                              <span className="block text-[11px] text-ink-muted font-mono">
                                Populasi: {item.jumlahAnggotaKelas || "-"} anggota
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="font-mono text-xs font-bold text-status-tersedia bg-status-tersedia/10 px-3 py-1 rounded-full">
                                {item.totalKunjungan}x Hadir
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-semibold text-ink">
                              {item.siswaUnik || 0} Siswa
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-paper-sunken h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-group-pelajaran h-full rounded-full"
                                    style={{
                                      width: `${Math.min(100, item.persenPartisipasi || 0)}%`,
                                    }}
                                  />
                                </div>
                                <span className="font-mono text-[11px] font-semibold text-ink">
                                  {item.persenPartisipasi || 0}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right print:hidden">
                              <span className="text-xs font-semibold text-group-pelajaran hover:underline">
                                Lihat Siswa →
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tren Kunjungan Harian (4 Kolom) */}
              <div className="lg:col-span-4 bg-surface border border-line rounded-xl p-6 shadow-sm space-y-4">
                <div className="border-b border-line pb-3">
                  <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-group-hiburan" />
                    <span>Tren Kunjungan Harian</span>
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Rekap jumlah kehadiran siswa per tanggal
                  </p>
                </div>

                <div className="space-y-3">
                  {(dataLaporan?.trenKunjungan || []).length === 0 ? (
                    <p className="text-xs text-ink-muted py-6 text-center">
                      Belum ada riwayat tren harian.
                    </p>
                  ) : (
                    (dataLaporan?.trenKunjungan || []).map((t: any) => (
                      <div key={t.tanggal} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-ink">{t.tanggal}</span>
                          <strong className="text-status-tersedia">
                            {t.total} Hadir ({t.siswaUnik || t.total} Siswa)
                          </strong>
                        </div>
                        <div className="w-full bg-paper-sunken h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-status-tersedia h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(10, (t.total / 45) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2B: REKAP KUNJUNGAN BERDASARKAN SISWA (INDIVIDU) */}
          {modeKunjungan === "siswa" && (
            <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-line flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif font-bold text-base text-ink">
                    Rekapitulasi Kehadiran Berdasarkan Siswa (Per Individu)
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Menampilkan akumulasi frekuensi kunjungan per siswa, metode presensi (QR/NIS), dan korelasi jumlah buku yang dipinjam.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {filterKelasKunjungan !== "semua" && (
                    <button
                      type="button"
                      onClick={() => setFilterKelasKunjungan("semua")}
                      className="text-xs text-danger hover:underline font-medium print:hidden"
                    >
                      Tampilkan Semua Kelas
                    </button>
                  )}
                  <span className="px-3 py-1 rounded-full bg-paper-sunken font-mono text-xs font-semibold text-ink">
                    {kunjunganSiswaTerfilter.length} Siswa Tercatat
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper-sunken/60 font-sans text-[11px] font-semibold tracking-wider uppercase text-ink-muted border-b border-line">
                    <tr>
                      <th className="py-3 px-4 w-12">No</th>
                      <th className="py-3 px-4">Nomor Induk (NIS)</th>
                      <th className="py-3 px-4">Nama Lengkap Siswa</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4 text-center">Total Kunjungan</th>
                      <th className="py-3 px-4 text-center">Metode (QR / Manual)</th>
                      <th className="py-3 px-4 text-center">Buku Dipinjam</th>
                      <th className="py-3 px-4">Kunjungan Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {kunjunganSiswaTerfilter.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-ink-muted">
                          Belum ada data kunjungan siswa yang sesuai dengan filter.
                        </td>
                      </tr>
                    ) : (
                      kunjunganSiswaTerfilter.map((s: any, idx: number) => (
                        <tr key={s.id} className="hover:bg-paper-sunken/20 transition-colors">
                          <td className="py-3 px-4 font-mono text-ink-muted">#{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-ink">{s.nomorInduk}</td>
                          <td className="py-3 px-4 font-medium text-ink">{s.nama}</td>
                          <td className="py-3 px-4 font-mono">
                            <span className="px-2 py-0.5 rounded bg-paper-sunken text-ink font-semibold">
                              {s.kelas || "Umum"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-status-tersedia/10 text-status-tersedia font-mono font-bold">
                              {s.totalKunjungan}x Hadir
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[11px] text-ink-muted">
                            <span className="text-ink font-semibold">{s.viaQr || 0} QR</span> •{" "}
                            <span>{s.viaManual || 0} NIS</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-semibold text-group-pelajaran">
                              {s.totalPinjamBuku || 0} Buku
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-ink-muted">
                            {s.kunjunganTerakhir
                              ? new Date(s.kunjunganTerakhir).toLocaleString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODE 2C: LOG WAKTU KEDATANGAN HARIAN SISWA */}
          {modeKunjungan === "log" && (
            <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-ink">
                    Log Riwayat Presensi Kehadiran Siswa (Real-Time)
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Urutan kronologis kedatangan siswa di Kiosk Presensi Perpustakaan NETRI.
                  </p>
                </div>
                <span className="font-mono text-xs text-ink-muted">
                  {logKunjunganTerfilter.length} Baris Presensi
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper-sunken/60 font-sans text-[11px] font-semibold tracking-wider uppercase text-ink-muted border-b border-line">
                    <tr>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Jam WIB</th>
                      <th className="py-3 px-4">Nomor Induk</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Metode Presensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {logKunjunganTerfilter.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-ink-muted">
                          Belum ada log kehadiran siswa yang cocok.
                        </td>
                      </tr>
                    ) : (
                      logKunjunganTerfilter.map((l: any) => (
                        <tr key={l.id} className="hover:bg-paper-sunken/20">
                          <td className="py-3 px-4 font-mono text-ink">
                            {new Date(l.tanggal).toLocaleDateString("id-ID", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-status-tersedia">
                            {new Date(l.waktu).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            WIB
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-ink">{l.nomorInduk}</td>
                          <td className="py-3 px-4 font-medium text-ink">{l.nama}</td>
                          <td className="py-3 px-4 font-mono">{l.kelas || "Umum"}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                                l.metode === "qr"
                                  ? "bg-status-tersedia/10 text-status-tersedia"
                                  : "bg-paper-sunken text-ink-muted"
                              }`}
                            >
                              <QrCode className="w-3 h-3" />
                              <span>{l.metode === "qr" ? "Scan Kartu QR" : "Ketik Manual NIS"}</span>
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PERINGKAT & STATISTIK (BUKU, SISWA PEMINJAMAN, & SISWA KUNJUNGAN)  */}
      {/* ========================================================================= */}
      {tabAktif === "peringkat" && (
        <div className="space-y-6">
          {/* Sub-Toolbar Filter Peringkat */}
          <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setModePeringkat("semua")}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  modePeringkat === "semua"
                    ? "bg-ink text-paper"
                    : "bg-paper-sunken/70 text-ink-muted hover:text-ink"
                }`}
              >
                Tampilkan Semua Peringkat (3 Kategori)
              </button>
              <button
                type="button"
                onClick={() => setModePeringkat("buku")}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  modePeringkat === "buku"
                    ? "bg-ink text-paper"
                    : "bg-paper-sunken/70 text-ink-muted hover:text-ink"
                }`}
              >
                Peringkat Buku Terpopuler ({bukuPopulerTerfilter.length})
              </button>
              <button
                type="button"
                onClick={() => setModePeringkat("siswa_pinjam")}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  modePeringkat === "siswa_pinjam"
                    ? "bg-ink text-paper"
                    : "bg-paper-sunken/70 text-ink-muted hover:text-ink"
                }`}
              >
                Siswa Teraktif: Peminjaman Buku ({siswaPinjamTerfilter.length})
              </button>
              <button
                type="button"
                onClick={() => setModePeringkat("siswa_kunjungan")}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  modePeringkat === "siswa_kunjungan"
                    ? "bg-ink text-paper"
                    : "bg-paper-sunken/70 text-ink-muted hover:text-ink"
                }`}
              >
                Siswa Teraktif: Kunjungan Kiosk ({siswaKunjunganTerfilter.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter Kelompok Buku */}
              {(modePeringkat === "semua" || modePeringkat === "buku") && (
                <select
                  value={filterKelompokBuku}
                  onChange={(e: any) => setFilterKelompokBuku(e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[36px]"
                >
                  <option value="semua">Semua Kelompok Buku</option>
                  <option value="hiburan">Bacaan Hiburan</option>
                  <option value="pelajaran">Buku Pelajaran</option>
                </select>
              )}

              {/* Filter Kelas untuk Peringkat Siswa */}
              {modePeringkat !== "buku" && (
                <select
                  value={filterKelasPeringkat}
                  onChange={(e) => setFilterKelasPeringkat(e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-line bg-white text-xs min-h-[36px] font-mono"
                >
                  <option value="semua">Semua Kelas Siswa</option>
                  {daftarKelasUnik.map((kls) => (
                    <option key={kls} value={kls}>
                      Kelas {kls}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 1. TABEL PERINGKAT BUKU TERPOPULER */}
          {(modePeringkat === "semua" || modePeringkat === "buku") && (
            <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden break-inside-avoid">
              <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-group-hiburan" />
                  <div>
                    <h3 className="font-serif font-bold text-base text-ink">
                      Peringkat Koleksi Buku Paling Sering Dipinjam
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Berdasarkan akumulasi frekuensi sirkulasi peminjaman dan jumlah siswa peminjam unik
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs text-ink-muted">
                  Top {bukuPopulerTerfilter.length} Judul
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper-sunken/60 font-sans text-[11px] font-semibold tracking-wider uppercase text-ink-muted border-b border-line">
                    <tr>
                      <th className="py-3 px-4 w-14">Rank</th>
                      <th className="py-3 px-4">Judul & Penulis Buku</th>
                      <th className="py-3 px-4">Kategori & Kelompok</th>
                      <th className="py-3 px-4">Lokasi Rak</th>
                      <th className="py-3 px-4 text-center">Peminjam Unik</th>
                      <th className="py-3 px-4 text-right">Total Dipinjam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {bukuPopulerTerfilter.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-ink-muted">
                          Belum ada data peminjaman buku pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      bukuPopulerTerfilter.map((b: any, idx: number) => (
                        <tr key={b.id} className="hover:bg-paper-sunken/20">
                          <td className="py-3.5 px-4">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                                idx === 0
                                  ? "bg-amber-500 text-white"
                                  : idx === 1
                                  ? "bg-neutral-700 text-white"
                                  : idx === 2
                                  ? "bg-amber-700 text-white"
                                  : "bg-paper-sunken text-ink"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-serif font-bold text-sm text-ink">{b.judul}</div>
                            <div className="text-xs text-ink-muted">
                              {b.penulis} {b.penerbit ? `• ${b.penerbit}` : ""}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase text-white font-semibold mr-1.5 ${
                                b.kelompok === "pelajaran"
                                  ? "bg-group-pelajaran"
                                  : "bg-group-hiburan"
                              }`}
                            >
                              {b.kelompok}
                            </span>
                            <span className="text-ink font-medium">{b.kategoriNama || "-"}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-ink-muted">
                            {b.lokasiRak || "-"}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-semibold text-ink">
                            {b.peminjamUnik || 1} Siswa
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-mono text-xs font-bold text-ink bg-paper-sunken px-3 py-1 rounded-full">
                              {b.totalPinjam}x Dipinjam
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. DUA TABEL PERINGKAT SISWA TERAKTIF: BERDASARKAN PEMINJAMAN BUKU & BERDASARKAN KUNJUNGAN */}
          <div
            className={`grid grid-cols-1 ${
              modePeringkat === "semua" ? "lg:grid-cols-2" : "lg:grid-cols-1"
            } gap-6 items-start`}
          >
            {/* 2A. PERINGKAT SISWA TERAKTIF BERDASARKAN PEMINJAMAN BUKU */}
            {(modePeringkat === "semua" || modePeringkat === "siswa_pinjam") && (
              <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden break-inside-avoid">
                <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-5 h-5 text-group-pelajaran" />
                    <div>
                      <h3 className="font-serif font-bold text-base text-ink">
                        Peringkat Siswa Teraktif — Berdasarkan Peminjaman Buku
                      </h3>
                      <p className="text-xs text-ink-muted">
                        Duta Baca: Siswa dengan jumlah peminjaman koleksi buku terbanyak
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-group-pelajaran font-semibold bg-group-pelajaran/10 px-2.5 py-1 rounded">
                    Top Peminjam
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-paper-sunken/60 font-sans text-[11px] font-semibold tracking-wider uppercase text-ink-muted border-b border-line">
                      <tr>
                        <th className="py-3 px-4 w-12">Rank</th>
                        <th className="py-3 px-4">Identitas Siswa</th>
                        <th className="py-3 px-4">Kelas</th>
                        <th className="py-3 px-4 text-center">Rincian Sirkulasi</th>
                        <th className="py-3 px-4 text-right">Total Buku</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {siswaPinjamTerfilter.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-ink-muted">
                            Belum ada data peminjaman buku oleh siswa.
                          </td>
                        </tr>
                      ) : (
                        siswaPinjamTerfilter.map((s: any, idx: number) => (
                          <tr key={s.id} className="hover:bg-paper-sunken/20">
                            <td className="py-3.5 px-4">
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                                  idx === 0
                                    ? "bg-amber-500 text-white"
                                    : idx === 1
                                    ? "bg-neutral-700 text-white"
                                    : idx === 2
                                    ? "bg-amber-700 text-white"
                                    : "bg-paper-sunken text-ink"
                                }`}
                              >
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-serif font-bold text-sm text-ink">{s.nama}</div>
                              <div className="font-mono text-[11px] text-ink-muted">
                                NIS: {s.nomorInduk}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              <span className="px-2 py-0.5 rounded bg-paper-sunken text-ink font-semibold">
                                {s.kelas || "Umum"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-[11px] text-ink-muted">
                              <span>{s.selesaiDikembalikan || 0} kembali</span> •{" "}
                              <span className="text-ink font-semibold">
                                {s.sedangDipinjam || 0} aktif
                              </span>{" "}
                              • <span>{s.totalKunjungan || 0}x hadir</span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="font-mono text-xs font-bold text-group-pelajaran bg-group-pelajaran/10 px-3 py-1 rounded-full">
                                {s.totalPinjam} Buku
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2B. PERINGKAT SISWA TERAKTIF BERDASARKAN KUNJUNGAN PERPUSTAKAAN */}
            {(modePeringkat === "semua" || modePeringkat === "siswa_kunjungan") && (
              <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden break-inside-avoid">
                <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-5 h-5 text-status-tersedia" />
                    <div>
                      <h3 className="font-serif font-bold text-base text-ink">
                        Peringkat Siswa Teraktif — Berdasarkan Kunjungan Kiosk
                      </h3>
                      <p className="text-xs text-ink-muted">
                        Pengunjung Terajin: Siswa dengan frekuensi kehadiran tertinggi di perpustakaan
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-status-tersedia font-semibold bg-status-tersedia/10 px-2.5 py-1 rounded">
                    Top Pengunjung
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-paper-sunken/60 font-sans text-[11px] font-semibold tracking-wider uppercase text-ink-muted border-b border-line">
                      <tr>
                        <th className="py-3 px-4 w-12">Rank</th>
                        <th className="py-3 px-4">Identitas Siswa</th>
                        <th className="py-3 px-4">Kelas</th>
                        <th className="py-3 px-4 text-center">Aktivitas & Terakhir Hadir</th>
                        <th className="py-3 px-4 text-right">Total Kunjungan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {siswaKunjunganTerfilter.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-ink-muted">
                            Belum ada data kunjungan siswa tercatat.
                          </td>
                        </tr>
                      ) : (
                        siswaKunjunganTerfilter.map((s: any, idx: number) => (
                          <tr key={s.id} className="hover:bg-paper-sunken/20">
                            <td className="py-3.5 px-4">
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                                  idx === 0
                                    ? "bg-status-tersedia text-white"
                                    : idx === 1
                                    ? "bg-neutral-700 text-white"
                                    : idx === 2
                                    ? "bg-amber-700 text-white"
                                    : "bg-paper-sunken text-ink"
                                }`}
                              >
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-serif font-bold text-sm text-ink">{s.nama}</div>
                              <div className="font-mono text-[11px] text-ink-muted">
                                NIS: {s.nomorInduk}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              <span className="px-2 py-0.5 rounded bg-paper-sunken text-ink font-semibold">
                                {s.kelas || "Umum"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-[11px] text-ink-muted">
                              <span className="text-ink font-semibold">
                                {s.totalPinjam || 0} buku dipinjam
                              </span>{" "}
                              •{" "}
                              <span>
                                {s.kunjunganTerakhir
                                  ? new Date(s.kunjunganTerakhir).toLocaleDateString("id-ID", {
                                      day: "2-digit",
                                      month: "short",
                                    })
                                  : "-"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="font-mono text-xs font-bold text-status-tersedia bg-status-tersedia/10 px-3 py-1 rounded-full">
                                {s.totalKunjungan}x Hadir
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">
            NIP. ........................................
          </p>
        </div>
        <div>
          <p className="text-gray-700">Penanggung Jawab,</p>
          <p className="font-bold text-black">Kepala Perpustakaan NETRI</p>
          <div className="h-20" />
          <p className="font-bold border-b border-black inline-block min-w-[200px] text-black">
            (......................................................)
          </p>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">
            NIP. ........................................
          </p>
        </div>
      </div>
    </div>
  );
}
