"use client";

/**
 * Perpustakaan NETRI - Sistem Cetak Kartu Anggota QR Siswa (Per-Siswa & Cetak Massal A4 Per Kelas)
 * Dirancang dengan ukuran presisi standar ISO ID-1 (86mm x 54mm),
 * 2 kolom x 4 baris (8 kartu per lembar A4), bebas 100% dari elemen navigasi web.
 */

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Printer,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Search,
  CheckSquare,
  Square,
  Users,
} from "lucide-react";

interface AnggotaItem {
  id: string;
  nomorInduk: string;
  nama: string;
  jenis: "siswa" | "guru" | "staf";
  kelas: string | null;
  status: string;
}

function CetakKartuSiswaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paramId = searchParams.get("id") || "";
  const paramKelas = searchParams.get("kelas") || "semua";
  const paramAutoPrint = searchParams.get("autoprint") === "true";

  const [semuaAnggota, setSemuaAnggota] = useState<AnggotaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pilihan Siswa
  const [modeCetak, setModeCetak] = useState<"tunggal" | "massal">(
    paramId ? "tunggal" : "massal"
  );
  const [filterKelas, setFilterKelas] = useState<string>(paramKelas);
  const [kataKunci, setKataKunci] = useState("");
  const [idTerpilih, setIdTerpilih] = useState<Set<string>>(new Set());

  useEffect(() => {
    const muatDataAnggota = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/admin/anggota");
        const json = await res.json();

        if (!res.ok || !json.sukses) {
          throw new Error(json.pesan || "Gagal memuat data anggota perpustakaan");
        }

        const aktifList: AnggotaItem[] = (json.data || []).filter(
          (a: AnggotaItem) => a.status === "aktif"
        );
        setSemuaAnggota(aktifList);

        if (paramId) {
          setModeCetak("tunggal");
          setIdTerpilih(new Set([paramId]));
        } else if (paramKelas && paramKelas !== "semua") {
          setModeCetak("massal");
          const sekelas = aktifList
            .filter((a) => (a.kelas || "").trim() === paramKelas.trim())
            .map((a) => a.id);
          setIdTerpilih(new Set(sekelas));
        } else {
          setModeCetak("massal");
          // Secara default centang kelas pertama atau maksimal 40 siswa pertama agar ringan
          const kelasPertama =
            aktifList.find((a) => a.kelas && a.kelas.trim())?.kelas?.trim() || "semua";
          if (kelasPertama !== "semua") {
            setFilterKelas(kelasPertama);
            setIdTerpilih(
              new Set(
                aktifList
                  .filter((a) => (a.kelas || "").trim() === kelasPertama)
                  .map((a) => a.id)
              )
            );
          } else {
            setIdTerpilih(new Set(aktifList.map((a) => a.id)));
          }
        }
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat menyiapkan kartu anggota");
      } finally {
        setLoading(false);
      }
    };

    muatDataAnggota();
  }, [paramId, paramKelas]);

  // Daftar kelas unik
  const daftarKelasUnik = useMemo(() => {
    const setKls = new Set<string>();
    for (const a of semuaAnggota) {
      if (a.kelas && a.kelas.trim()) {
        setKls.add(a.kelas.trim());
      }
    }
    return Array.from(setKls).sort();
  }, [semuaAnggota]);

  // Daftar anggota sesuai filter
  const anggotaTerfilter = useMemo(() => {
    if (modeCetak === "tunggal" && paramId) {
      return semuaAnggota.filter((a) => a.id === paramId);
    }

    return semuaAnggota.filter((a) => {
      if (filterKelas !== "semua" && (a.kelas || "").trim() !== filterKelas) return false;
      if (kataKunci.trim()) {
        const q = kataKunci.toLowerCase();
        return (
          a.nama.toLowerCase().includes(q) ||
          a.nomorInduk.toLowerCase().includes(q) ||
          (a.kelas || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [semuaAnggota, modeCetak, paramId, filterKelas, kataKunci]);

  // Anggota yang dicentang untuk dicetak
  const anggotaSiapCetak = useMemo(() => {
    return anggotaTerfilter.filter((a) => idTerpilih.has(a.id));
  }, [anggotaTerfilter, idTerpilih]);

  // Nama berkas PDF dinamis sesuai konteks cetak (1 Siswa vs Per Kelas vs Massal)
  const namaBerkasCetak = useMemo(() => {
    const bersihkan = (str: string) =>
      str
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);

    if (anggotaSiapCetak.length === 1) {
      const s = anggotaSiapCetak[0];
      const kls = s.kelas ? bersihkan(s.kelas) : s.jenis.toUpperCase();
      return `Kartu_Anggota_${bersihkan(s.nama)}_${kls}_${bersihkan(s.nomorInduk)}`;
    }

    if (anggotaSiapCetak.length > 1) {
      const kelasSet = new Set(
        anggotaSiapCetak.map((a) => (a.kelas || "Umum").trim())
      );
      if (kelasSet.size === 1) {
        const klsTunggal = Array.from(kelasSet)[0];
        return `Cetak_Massal_Kartu_Kelas_${bersihkan(klsTunggal)}_${anggotaSiapCetak.length}_Siswa`;
      }
      return `Cetak_Massal_Kartu_Anggota_NETRI_${anggotaSiapCetak.length}_Anggota`;
    }

    return "Kartu_Anggota_Perpustakaan_NETRI";
  }, [anggotaSiapCetak]);

  // Sinkronkan document.title agar Save as PDF otomatis menggunakan nama berkas yang sesuai
  useEffect(() => {
    const judulAsli = document.title;
    document.title = namaBerkasCetak;
    return () => {
      document.title = judulAsli;
    };
  }, [namaBerkasCetak]);

  const jalankanCetak = () => {
    document.title = namaBerkasCetak;
    window.print();
  };

  // Saat ganti kelas di dropdown, otomatis centang seluruh siswa di kelas tersebut
  const handleGantiKelas = (kelasBaru: string) => {
    setModeCetak("massal");
    setFilterKelas(kelasBaru);
    if (kelasBaru === "semua") {
      setIdTerpilih(new Set(semuaAnggota.map((a) => a.id)));
    } else {
      const sekelas = semuaAnggota
        .filter((a) => (a.kelas || "").trim() === kelasBaru)
        .map((a) => a.id);
      setIdTerpilih(new Set(sekelas));
    }
  };

  const togglePilihSiswa = (id: string) => {
    setIdTerpilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const pilihSemuaTerfilter = () => {
    setIdTerpilih((prev) => {
      const next = new Set(prev);
      for (const a of anggotaTerfilter) {
        next.add(a.id);
      }
      return next;
    });
  };

  const kosongkanTerfilter = () => {
    setIdTerpilih((prev) => {
      const next = new Set(prev);
      for (const a of anggotaTerfilter) {
        next.delete(a.id);
      }
      return next;
    });
  };

  useEffect(() => {
    if (paramAutoPrint && !loading && anggotaSiapCetak.length > 0) {
      const timer = setTimeout(() => {
        document.title = namaBerkasCetak;
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [paramAutoPrint, loading, anggotaSiapCetak.length, namaBerkasCetak]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
        <p className="font-sans text-sm text-ink-muted">
          Menyiapkan tata letak kartu anggota perpustakaan...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-bold text-xl text-ink">Gagal Menyiapkan Kartu</h2>
        <p className="font-sans text-sm text-ink-muted max-w-md">{error}</p>
        <button
          onClick={() => router.push("/admin/anggota")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Data Anggota</span>
        </button>
      </div>
    );
  }

  const estimasiHalamanA4 = Math.max(1, Math.ceil(anggotaSiapCetak.length / 8));

  return (
    <div className="min-h-screen bg-paper-sunken/60 print:bg-white py-6 px-4 sm:px-8 print:p-0">
      {/* ===================================================================== */}
      {/* PANEL KONTROL CETAK (OTOMATIS HILANG 100% SAAT DICETAK KE KERTAS/PDF) */}
      {/* ===================================================================== */}
      <div className="max-w-[210mm] mx-auto mb-6 bg-surface border border-line rounded-2xl p-5 shadow-sm space-y-4 print:hidden">
        {/* Baris Atas: Judul & Tombol Cetak */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/anggota")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line bg-paper hover:bg-paper-sunken text-ink text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Anggota</span>
            </button>
            <div>
              <h1 className="font-serif font-bold text-lg text-ink">
                {modeCetak === "tunggal"
                  ? "Cetak Kartu Anggota Per-Siswa (Standar ID-1)"
                  : "Cetak Kartu Anggota Massal A4 (8 Kartu / Lembar)"}
              </h1>
              <p className="font-sans text-xs text-ink-muted">
                Siap cetak <strong>{anggotaSiapCetak.length} kartu anggota</strong> (~{estimasiHalamanA4} lembar A4 • Ukuran 86mm x 54mm)
              </p>
              <p className="font-mono text-[11px] text-status-tersedia mt-0.5">
                Nama File PDF: <strong>{namaBerkasCetak}.pdf</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {modeCetak === "tunggal" && (
              <button
                onClick={() => {
                  const kls = anggotaTerfilter[0]?.kelas?.trim() || "semua";
                  handleGantiKelas(kls);
                }}
                className="px-3.5 py-2.5 rounded-lg border border-line bg-paper hover:bg-paper-sunken text-ink text-xs font-semibold transition-colors"
              >
                Beralih ke Cetak Massal Kelas
              </button>
            )}

            <button
              onClick={jalankanCetak}
              disabled={anggotaSiapCetak.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 shadow-sm disabled:opacity-40 transition-all min-h-[42px]"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak {anggotaSiapCetak.length} Kartu Sekarang</span>
            </button>
          </div>
        </div>

        {/* Baris Filter Kelas & Pencarian (Saat Mode Massal) */}
        {modeCetak === "massal" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Pilih Rombongan Kelas:
                </label>
                <select
                  value={filterKelas}
                  onChange={(e) => handleGantiKelas(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-line bg-white text-xs font-medium text-ink focus:border-ink min-h-[38px]"
                >
                  <option value="semua">
                    🎓 Semua Kelas ({semuaAnggota.length} Anggota Aktif)
                  </option>
                  {daftarKelasUnik.map((kls) => {
                    const jml = semuaAnggota.filter((a) => (a.kelas || "").trim() === kls).length;
                    return (
                      <option key={kls} value={kls}>
                        🏫 Kelas {kls} ({jml} Siswa)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="sm:col-span-7">
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Cari Nama Siswa atau NIS:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={kataKunci}
                    onChange={(e) => setKataKunci(e.target.value)}
                    placeholder="Ketik nama siswa atau nomor induk (NIS)..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-line bg-white text-xs text-ink focus:border-ink min-h-[38px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60 text-xs">
              <span className="text-ink-muted">
                Klik pada kartu di bawah untuk memilih/membatalkan siswa tertentu:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={pilihSemuaTerfilter}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-line bg-paper hover:bg-paper-sunken text-ink font-medium"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-status-tersedia" />
                  <span>Pilih Semua ({anggotaTerfilter.length})</span>
                </button>
                <button
                  type="button"
                  onClick={kosongkanTerfilter}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-line bg-paper hover:bg-paper-sunken text-ink-muted hover:text-ink font-medium"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Kosongkan Pilihan</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===================================================================== */}
      {/* KANVAS KERTAS A4 KARTU ANGGOTA SISWA (MURNI KARTU SAAT DICETAK)       */}
      {/* ===================================================================== */}
      {anggotaSiapCetak.length === 0 ? (
        <div className="max-w-[210mm] mx-auto bg-white border border-line rounded-2xl p-12 text-center space-y-3 print:hidden">
          <Users className="w-8 h-8 text-ink-muted mx-auto stroke-[1.5]" />
          <p className="text-sm font-medium text-ink">Belum ada kartu siswa yang dipilih untuk dicetak.</p>
          <p className="text-xs text-ink-muted">
            Klik tombol <strong>Pilih Semua</strong> di atas atau pilih kelas dari daftar.
          </p>
        </div>
      ) : (
        <div className="max-w-[210mm] mx-auto bg-white shadow-md rounded-xl p-[10mm] print:shadow-none print:rounded-none print:p-0 print:max-w-none print:w-full">
          {/* Grid Presisi 2 Kolom Standar Kartu ID-1 (86mm x 54mm) */}
          <div
            className={`grid gap-[5mm] justify-center ${
              anggotaSiapCetak.length === 1
                ? "grid-cols-1 place-items-center print:place-items-start"
                : "grid-cols-1 md:grid-cols-2 print:grid-cols-2"
            }`}
          >
            {anggotaTerfilter.map((m) => {
              const terpilih = idTerpilih.has(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => modeCetak === "massal" && togglePilihSiswa(m.id)}
                  title={
                    modeCetak === "massal"
                      ? "Klik untuk memilih / membatalkan kartu siswa ini"
                      : m.nama
                  }
                  className={`${
                    modeCetak === "massal" ? "cursor-pointer" : ""
                  } select-none border border-dashed transition-all break-inside-avoid flex flex-col justify-between overflow-hidden bg-white ${
                    terpilih
                      ? "border-neutral-700 ring-1 ring-ink/10 print:ring-0 print:border-black"
                      : "opacity-35 border-neutral-300 print:hidden"
                  }`}
                  style={{ width: "86mm", height: "54mm" }}
                >
                  {/* 1. Kop Resmi Kartu Anggota Perpustakaan */}
                  <div
                    className="bg-black text-white px-[3.5mm] flex items-center justify-between shrink-0"
                    style={{ height: "11.5mm" }}
                  >
                    <div className="flex items-center gap-[2mm]">
                      <div className="w-[6mm] h-[6mm] rounded-xs bg-white text-black flex items-center justify-center font-serif font-extrabold text-[8.5pt] leading-none shrink-0">
                        N
                      </div>
                      <div>
                        <span className="font-serif font-bold text-[8.5pt] uppercase tracking-wider block leading-none text-white">
                          PERPUSTAKAAN NETRI
                        </span>
                        <span className="font-sans text-[5.5pt] uppercase tracking-widest text-neutral-300 block mt-[0.8mm] leading-none">
                          KARTU ANGGOTA RESMI • TA 2026/2027
                        </span>
                      </div>
                    </div>
                    <span className="font-sans text-[6pt] uppercase font-bold px-[1.5mm] py-[0.6mm] border border-white text-white tracking-wider leading-none shrink-0">
                      {m.jenis}
                    </span>
                  </div>

                  {/* 2. Badan Kartu: Identitas Siswa (Kiri) + QR Code Presisi (Kanan) */}
                  <div
                    className="flex items-center justify-between gap-[3mm] px-[3.5mm] py-[2.5mm] flex-1 min-h-0 bg-white"
                    style={{ height: "35.5mm" }}
                  >
                    {/* Rincian Data Siswa */}
                    <div className="min-w-0 flex-1 flex flex-col justify-between h-full py-[0.5mm]">
                      <div>
                        <span className="font-sans text-[5.5pt] uppercase tracking-wider text-neutral-500 font-bold block leading-none">
                          NAMA LENGKAP ANGGOTA
                        </span>
                        <h4 className="font-serif font-bold text-[9.5pt] text-black uppercase leading-[1.15] line-clamp-2 mt-[0.8mm]">
                          {m.nama}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-[2mm] border-t border-b border-black/25 py-[1.2mm]">
                        <div>
                          <span className="font-sans text-[5pt] uppercase tracking-wider text-neutral-500 font-bold block leading-none">
                            NOMOR INDUK (NIS)
                          </span>
                          <span className="font-mono font-extrabold text-[8pt] text-black block mt-[0.5mm] leading-none">
                            {m.nomorInduk}
                          </span>
                        </div>
                        <div>
                          <span className="font-sans text-[5pt] uppercase tracking-wider text-neutral-500 font-bold block leading-none">
                            ROMBEL / KELAS
                          </span>
                          <span className="font-sans font-bold text-[8pt] text-black block mt-[0.5mm] leading-none truncate">
                            {m.kelas || "UMUM"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[5.5pt] font-sans font-semibold text-neutral-700 leading-none">
                        <span>STATUS: AKTIF</span>
                        <span>BERLAKU SELAMA MENJADI SISWA</span>
                      </div>
                    </div>

                    {/* Kotak QR Code di Kanan */}
                    <div className="shrink-0 flex flex-col items-center justify-center">
                      <div
                        className="border border-black bg-white p-[1mm] flex items-center justify-center"
                        style={{ width: "24mm", height: "24mm" }}
                      >
                        <img
                          src={`/api/v1/admin/qr?tipe=anggota&id=${m.id}`}
                          alt={`QR ${m.nama}`}
                          className="w-full h-full object-contain block"
                        />
                      </div>
                      <span className="font-mono font-bold text-[5pt] text-black uppercase tracking-tight mt-[0.8mm] leading-none">
                        SCAN KIOSK & SIRKULASI
                      </span>
                    </div>
                  </div>

                  {/* 3. Footer Kartu */}
                  <div
                    className="border-t border-black/40 px-[3.5mm] flex items-center justify-between bg-neutral-50 print:bg-white text-[5.5pt] font-sans text-neutral-700 shrink-0"
                    style={{ height: "7mm" }}
                  >
                    <span className="italic">
                      Harap dibawa setiap berkunjung & meminjam koleksi buku
                    </span>
                    <span className="font-mono font-bold text-black uppercase">
                      NETRI LIBRARY ID
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CetakKartuAnggotaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-ink" />
        </div>
      }
    >
      <CetakKartuSiswaContent />
    </Suspense>
  );
}
