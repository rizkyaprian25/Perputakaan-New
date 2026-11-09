"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Globe,
  Search,
  QrCode,
  X,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  Layers,
  Printer,
  BookOpen,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { BookSpineTick } from "@/components/ui/BookSpineTick";
import { BookCover } from "@/components/ui/BookCover";
import { siarkanSinkronisasiPwa } from "@/components/ui/PwaSyncProvider";

export default function AdminBukuPage() {
  const [daftarBuku, setDaftarBuku] = useState<any[]>([]);
  const [daftarKategori, setDaftarKategori] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Pencarian Tabel Buku
  const [kataKunci, setKataKunci] = useState("");
  const [filterKelompok, setFilterKelompok] = useState<"semua" | "hiburan" | "pelajaran">("semua");

  // Modal 1: Cari Online (Google Books + Open Library)
  const [modalOnlineBuka, setModalOnlineBuka] = useState(false);
  const [queryOnline, setQueryOnline] = useState("");
  const [hasilOnline, setHasilOnline] = useState<any[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);

  // Modal 2: Form Tambah / Edit Buku
  const [modalFormBuka, setModalFormBuka] = useState(false);
  const [modeForm, setModeForm] = useState<"tambah" | "edit">("tambah");
  const [editBukuId, setEditBukuId] = useState<string | null>(null);
  const [formJudul, setFormJudul] = useState("");
  const [formPenulis, setFormPenulis] = useState("");
  const [formPenerbit, setFormPenerbit] = useState("");
  const [formTahun, setFormTahun] = useState<number | "">("");
  const [formHalaman, setFormHalaman] = useState<number | "">("");
  const [formIsbn, setFormIsbn] = useState("");
  const [formKategoriId, setFormKategoriId] = useState("");
  const [formSinopsis, setFormSinopsis] = useState("");
  const [formSampulUrl, setFormSampulUrl] = useState("");
  const [formJumlahEksemplar, setFormJumlahEksemplar] = useState(3);
  const [formLokasiRak, setFormLokasiRak] = useState("");
  const [formSumber, setFormSumber] = useState<string>("manual");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Unggah & Kompresi Sampul WebP
  const [sedangUnggahSampul, setSedangUnggahSampul] = useState(false);
  const [dragAktifSampul, setDragAktifSampul] = useState(false);
  const [infoKompresiSampul, setInfoKompresiSampul] = useState<{
    ukuranWebpKb: string;
    hematPersen: number;
  } | null>(null);
  const inputFileSampulRef = useRef<HTMLInputElement | null>(null);

  // Tambah Kategori Cepat
  const [modalKategoriBuka, setModalKategoriBuka] = useState(false);
  const [katNamaBaru, setKatNamaBaru] = useState("");
  const [katKelompokBaru, setKatKelompokBaru] = useState<"hiburan" | "pelajaran">("hiburan");
  const [isSavingKategori, setIsSavingKategori] = useState(false);

  // Modal 3: Kelola Eksemplar & Cetak Label Stiker QR
  const [modalEksemplarBuka, setModalEksemplarBuka] = useState(false);
  const [detailBukuAktif, setDetailBukuAktif] = useState<any | null>(null);
  const [daftarEksemplarAktif, setDaftarEksemplarAktif] = useState<any[]>([]);
  const [loadingEksemplar, setLoadingEksemplar] = useState(false);
  const [jumlahTambahEks, setJumlahTambahEks] = useState(2);
  const [isAddingEks, setIsAddingEks] = useState(false);
  const [modeCetakStiker, setModeCetakStiker] = useState(false);
  const [eksemplarCetakTerpilih, setEksemplarCetakTerpilih] = useState<any[] | null>(null);

  // Modal 4: Konfirmasi Hapus Buku
  const [bukuAkanDihapus, setBukuAkanDihapus] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toast, setToast] = useState<{ tipe: "sukses" | "error"; pesan: string } | null>(null);

  const tampilkanToast = (pesan: string, tipe: "sukses" | "error") => {
    setToast({ pesan, tipe });
    setTimeout(() => setToast(null), 4500);
  };

  // Fungsi Cetak Bersih: Mengisolasi Dokumen dan Menghilangkan 100% Elemen Background
  const cetakStikerTerisolasi = () => {
    document.body.setAttribute("data-print-mode", "stiker");
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
      const [resBuku, resKat] = await Promise.all([
        fetch("/api/v1/admin/buku"),
        fetch("/api/v1/admin/kategori"),
      ]);

      if (resBuku.status === 401 || resKat.status === 401) {
        window.location.href = "/admin/login?alihkan=/admin/buku";
        return;
      }

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
      console.error("Gagal memuat katalog buku:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    muatData();

    const handlePwaMutation = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.topik === "buku" || detail.topik === "sirkulasi") {
        muatData();
      }
    };
    window.addEventListener("netri:data-mutated", handlePwaMutation);
    return () => window.removeEventListener("netri:data-mutated", handlePwaMutation);
  }, []);

  // Filter buku secara instan di klien
  const bukuTersaring = useMemo(() => {
    return daftarBuku.filter((b) => {
      if (filterKelompok !== "semua" && b.kelompok !== filterKelompok) return false;
      if (!kataKunci.trim()) return true;
      const q = kataKunci.toLowerCase();
      return (
        b.judul?.toLowerCase().includes(q) ||
        b.penulis?.toLowerCase().includes(q) ||
        b.isbn?.toLowerCase().includes(q) ||
        b.kategoriNama?.toLowerCase().includes(q) ||
        b.lokasiRak?.toLowerCase().includes(q)
      );
    });
  }, [daftarBuku, kataKunci, filterKelompok]);

  // Deteksi apakah ISBN yang diketik di form tambah sudah ada di katalog
  const bukuDuplikatIsbn = useMemo(() => {
    if (modeForm !== "tambah" || !formIsbn.trim()) return null;
    const clean = formIsbn.replace(/[- ]+/g, "").toLowerCase();
    if (clean.length < 10) return null;
    return daftarBuku.find(
      (b) => b.isbn && b.isbn.replace(/[- ]+/g, "").toLowerCase() === clean
    );
  }, [formIsbn, daftarBuku, modeForm]);

  const bukaModalTambahBaru = () => {
    setModeForm("tambah");
    setEditBukuId(null);
    setFormJudul("");
    setFormPenulis("");
    setFormPenerbit("");
    setFormTahun("");
    setFormHalaman("");
    setFormIsbn("");
    setFormSinopsis("");
    setFormSampulUrl("");
    setInfoKompresiSampul(null);
    setFormJumlahEksemplar(3);
    setFormLokasiRak("R-01");
    setFormSumber("manual");
    if (daftarKategori.length > 0 && !formKategoriId) {
      setFormKategoriId(daftarKategori[0].id);
    }
    setModalFormBuka(true);
  };

  const bukaModalEditBuku = (item: any) => {
    setModeForm("edit");
    setEditBukuId(item.id);
    setFormJudul(item.judul || "");
    setFormPenulis(item.penulis || "");
    setFormPenerbit(item.penerbit || "");
    setFormTahun(item.tahunTerbit || "");
    setFormHalaman(item.jumlahHalaman || "");
    setFormIsbn(item.isbn || "");
    setFormKategoriId(item.kategoriId || (daftarKategori[0]?.id ?? ""));
    setFormSinopsis(item.sinopsis || "");
    setFormSampulUrl(item.sampulUrl || "");
    setInfoKompresiSampul(null);
    setFormLokasiRak(item.lokasiRak || "");
    setModalFormBuka(true);
  };

  // Handler Unggah Berkas Sampul Manual & Kompresi ke WebP
  const handleUnggahBerkasSampul = async (file: File | null | undefined) => {
    if (!file || sedangUnggahSampul) return;

    setSedangUnggahSampul(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/admin/buku/sampul", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal mengunggah & mengompresi sampul");
      }

      setFormSampulUrl(json.data.sampulUrl);
      setInfoKompresiSampul({
        ukuranWebpKb: (Number(json.data.ukuranWebpBytes || 0) / 1024).toFixed(1),
        hematPersen: Number(json.data.hematPersen || 0),
      });
      tampilkanToast(json.pesan, "sukses");
    } catch (err: any) {
      tampilkanToast(err.message || "Gagal mengompresi gambar sampul", "error");
    } finally {
      setSedangUnggahSampul(false);
      if (inputFileSampulRef.current) {
        inputFileSampulRef.current.value = "";
      }
    }
  };

  // Handler Cari Online (Google Books + Open Library)
  const handleCariOnline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryOnline.trim() || loadingOnline) return;

    setLoadingOnline(true);
    try {
      const res = await fetch(
        `/api/v1/admin/buku-eksternal?q=${encodeURIComponent(queryOnline.trim())}`
      );
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

  // Handler Pilih Buku dari Pencarian Online (Otomatis Kompresi Sampul ke WebP Lokal)
  const handlePilihBukuOnline = async (item: any) => {
    setModeForm("tambah");
    setEditBukuId(null);
    setFormJudul(item.judul || "");
    setFormPenulis(item.penulis || "");
    setFormPenerbit(item.penerbit || "");
    setFormTahun(item.tahunTerbit || "");
    setFormIsbn((item.isbn || "").replace(/[- ]+/g, ""));
    setFormSinopsis(item.sinopsis || "");
    setFormSampulUrl(item.sampulUrl || "");
    setInfoKompresiSampul(null);
    setFormSumber(item.sumber || "google_books");
    setFormJumlahEksemplar(3);

    // Otomatis arahkan ke kelompok pelajaran jika bersumber dari SIBI Kemendikbudristek
    if (item.sumber === "kemendikbud_sibi") {
      const katPelajaran = daftarKategori.find((k) => k.kelompok === "pelajaran");
      if (katPelajaran) {
        setFormKategoriId(katPelajaran.id);
      }
      setFormLokasiRak("P-01");
    } else {
      setFormLokasiRak("R-01");
    }

    setModalOnlineBuka(false);
    setModalFormBuka(true);

    // Jika buku eksternal memiliki URL sampul, unduh & kompresi otomatis ke .webp lokal agar ringan
    if (item.sampulUrl && /^https?:\/\//i.test(item.sampulUrl)) {
      setSedangUnggahSampul(true);
      try {
        const res = await fetch("/api/v1/admin/buku/sampul", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remoteUrl: item.sampulUrl }),
        });
        const json = await res.json();
        if (res.ok && json.sukses && json.data?.sampulUrl) {
          setFormSampulUrl(json.data.sampulUrl);
          setInfoKompresiSampul({
            ukuranWebpKb: (Number(json.data.ukuranWebpBytes || 0) / 1024).toFixed(1),
            hematPersen: Number(json.data.hematPersen || 0),
          });
          tampilkanToast(
            `Metadata '${item.judul}' disalin & sampul dikompresi ke WebP (${(
              Number(json.data.ukuranWebpBytes || 0) / 1024
            ).toFixed(1)} KB).`,
            "sukses"
          );
          return;
        }
      } catch {
        // Fallback tetap menggunakan sampulUrl asli jika gagal mengunduh
      } finally {
        setSedangUnggahSampul(false);
      }
    }

    tampilkanToast(`Metadata & sampul '${item.judul}' disalin ke formulir.`, "sukses");
  };

  // Simpan Buku (Tambah Baru atau Edit)
  const handleSimpanBuku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim() || !formPenulis.trim() || !formKategoriId || isSubmitting || sedangUnggahSampul) return;

    const isbnBersih = formIsbn.trim().replace(/[- ]+/g, "");

    setIsSubmitting(true);
    try {
      const url =
        modeForm === "edit" && editBukuId
          ? `/api/v1/admin/buku/${editBukuId}`
          : "/api/v1/admin/buku";
      const method = modeForm === "edit" ? "PUT" : "POST";

      const payload: Record<string, any> = {
        judul: formJudul.trim(),
        penulis: formPenulis.trim(),
        penerbit: formPenerbit.trim() || undefined,
        tahunTerbit: formTahun ? Number(formTahun) : undefined,
        jumlahHalaman: formHalaman ? Number(formHalaman) : undefined,
        isbn: isbnBersih || undefined,
        kategoriId: formKategoriId,
        sinopsis: formSinopsis.trim() || undefined,
        sampulUrl: formSampulUrl.trim() || "",
        lokasiRak: formLokasiRak.trim() || undefined,
      };

      if (modeForm === "tambah") {
        payload.jumlahEksemplar = Number(formJumlahEksemplar);
        payload.sumber = formSumber;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal menyimpan buku");
      }

      tampilkanToast(json.pesan, "sukses");
      setModalFormBuka(false);
      await muatData();
      siarkanSinkronisasiPwa("buku", `Katalog '${formJudul.trim()}' diperbarui`);
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tambah Kategori Baru
  const handleSimpanKategoriBaru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!katNamaBaru.trim() || isSavingKategori) return;

    setIsSavingKategori(true);
    try {
      const res = await fetch("/api/v1/admin/kategori", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kelompok: katKelompokBaru,
          nama: katNamaBaru.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal membuat kategori");
      }
      tampilkanToast(json.pesan, "sukses");
      setKatNamaBaru("");
      setModalKategoriBuka(false);
      await muatData();
      if (json.data?.id) {
        setFormKategoriId(json.data.id);
      }
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setIsSavingKategori(false);
    }
  };

  // Buka Modal Rincian Eksemplar & Cetak QR
  const bukaModalEksemplar = async (bukuItem: any, langsungCetak = false) => {
    setDetailBukuAktif(bukuItem);
    setModeCetakStiker(langsungCetak);
    setEksemplarCetakTerpilih(null);
    setModalEksemplarBuka(true);
    setLoadingEksemplar(true);

    try {
      const res = await fetch(`/api/v1/admin/buku/${bukuItem.id}`);
      const json = await res.json();
      if (json.sukses && json.data) {
        setDetailBukuAktif(json.data.buku);
        setDaftarEksemplarAktif(json.data.eksemplar || []);
      }
    } catch (err) {
      console.error(err);
      tampilkanToast("Gagal memuat daftar eksemplar", "error");
    } finally {
      setLoadingEksemplar(false);
    }
  };

  // Tambah N Eksemplar Baru pada Buku yang Sudah Ada
  const handleTambahEksemplar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailBukuAktif || isAddingEks || jumlahTambahEks < 1) return;

    setIsAddingEks(true);
    try {
      const res = await fetch(`/api/v1/admin/buku/${detailBukuAktif.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aksi: "tambah_eksemplar",
          jumlah: Number(jumlahTambahEks),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal menambah eksemplar");
      }
      tampilkanToast(json.pesan, "sukses");
      await bukaModalEksemplar(detailBukuAktif, false);
      await muatData();
      siarkanSinkronisasiPwa("buku", `Eksemplar baru ditambahkan`);
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setIsAddingEks(false);
    }
  };

  // Ubah Status Kondisi Eksemplar (Tersedia / Rusak / Hilang)
  const handleUbahStatusEksemplar = async (
    eksemplarId: string,
    statusBaru: "tersedia" | "rusak" | "hilang"
  ) => {
    if (!detailBukuAktif) return;
    try {
      const res = await fetch(`/api/v1/admin/buku/${detailBukuAktif.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aksi: "ubah_status",
          eksemplarId,
          status: statusBaru,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal mengubah status eksemplar");
      }
      tampilkanToast(json.pesan, "sukses");
      await bukaModalEksemplar(detailBukuAktif, false);
      await muatData();
      siarkanSinkronisasiPwa("buku", `Eksemplar baru ditambahkan`);
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    }
  };

  // Hapus Buku (Soft-Delete)
  const handleKonfirmasiHapus = async () => {
    if (!bukuAkanDihapus || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/buku/${bukuAkanDihapus.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal menghapus buku");
      }
      tampilkanToast(json.pesan, "sukses");
      setBukuAkanDihapus(null);
      await muatData();
      siarkanSinkronisasiPwa("buku", `Koleksi buku diperbarui`);
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const kategoriTerpilihObj = daftarKategori.find((k) => k.id === formKategoriId);

  return (
    <div className="space-y-6 max-w-[1440px] katalog-view">
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

      {/* Header Halaman Buku - Tersembunyi saat Cetak */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4 print:hidden katalog-header">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Katalog & Eksemplar Buku</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Kelola judul koleksi perpustakaan, tambah unit eksemplar fisik, dan cetak stiker QR punggung buku.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/admin/buku/cetak-stiker"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold transition-colors min-h-[44px]"
            title="Cetak stiker QR massal untuk seluruh buku atau per judul"
          >
            <Printer className="w-4 h-4 text-status-tersedia" />
            <span>Cetak QR Massal (A4)</span>
          </a>

          <button
            onClick={() => setModalKategoriBuka(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold transition-colors min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5 text-ink-muted" />
            <span>Kategori Baru</span>
          </button>

          <button
            onClick={() => setModalOnlineBuka(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-line bg-surface hover:bg-paper-sunken text-ink text-xs font-semibold transition-colors min-h-[44px]"
          >
            <Globe className="w-4 h-4 text-group-pelajaran" />
            <span>Cari Buku Online (ISBN / Judul)</span>
          </button>

          <button
            onClick={bukaModalTambahBaru}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-ink text-paper text-xs font-semibold hover:bg-ink/90 transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Buku Manual</span>
          </button>
        </div>
      </div>

      {/* Bar Pencarian & Filter Kelompok - Tersembunyi saat Cetak */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-line shadow-sm print:hidden">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={kataKunci}
            onChange={(e) => setKataKunci(e.target.value)}
            placeholder="Cari judul, penulis, ISBN, kategori, atau lokasi rak..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-line bg-paper/50 text-xs text-ink focus:border-ink focus:bg-white min-h-[40px]"
          />
          {kataKunci && (
            <button
              onClick={() => setKataKunci("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(["semua", "hiburan", "pelajaran"] as const).map((kel) => (
            <button
              key={kel}
              onClick={() => setFilterKelompok(kel)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium capitalize transition-colors min-h-[40px] ${
                filterKelompok === kel
                  ? "bg-ink text-paper font-semibold"
                  : "bg-paper-sunken/70 text-ink-muted hover:text-ink"
              }`}
            >
              {kel === "semua" ? "Semua Kelompok" : `Kelompok ${kel}`}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Daftar Buku - Tersembunyi saat Cetak */}
      <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden print:hidden katalog-table">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-serif font-bold text-base text-ink">Daftar Koleksi Terdaftar</h2>
          <span className="font-mono text-xs text-ink-muted">
            Menampilkan {bukuTersaring.length} dari {daftarBuku.length} Judul
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-ink-muted font-mono">
            Memuat data katalog dari server MySQL...
          </div>
        ) : bukuTersaring.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-ink-muted mx-auto stroke-[1.5]" />
            <p className="text-sm text-ink-muted">
              Belum ada koleksi buku yang cocok. Klik <strong>Tambah Buku Manual</strong> atau{" "}
              <strong>Cari Buku Online</strong>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-paper-sunken/50 text-ink-muted font-sans text-[11px] font-semibold tracking-wider uppercase">
                  <th className="py-3.5 px-6">Judul & Penulis</th>
                  <th className="py-3.5 px-4">Kelompok</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Rak</th>
                  <th className="py-3.5 px-4">Ketersediaan Fisik</th>
                  <th className="py-3.5 px-6 text-right">Tindakan & Label QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {bukuTersaring.map((item) => (
                  <tr key={item.id} className="hover:bg-paper-sunken/20 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 shrink-0">
                          <BookCover
                            judul={item.judul}
                            penulis={item.penulis}
                            kelompok={item.kelompok}
                            sampulUrl={item.sampulUrl}
                            className="p-1.5 text-[8px] rounded"
                          />
                        </div>
                        <div>
                          <p className="font-serif font-bold text-sm text-ink">{item.judul}</p>
                          <p className="text-ink-muted mt-0.5">
                            {item.penulis}{" "}
                            {item.penerbit ? `• ${item.penerbit}` : ""}{" "}
                            {item.tahunTerbit ? `(${item.tahunTerbit})` : ""}
                          </p>
                          {item.isbn && (
                            <span className="font-mono text-[10px] text-ink-muted block mt-0.5">
                              ISBN: {item.isbn}
                            </span>
                          )}
                        </div>
                      </div>
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
                    <td className="py-3.5 px-6 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => bukaModalEksemplar(item, false)}
                          title="Kelola Unit Eksemplar & Tambah Stok"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-line bg-paper hover:bg-paper-sunken text-ink font-medium transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5 text-group-pelajaran" />
                          <span>{item.totalEksemplar} Unit</span>
                        </button>

                        <a
                          href={`/admin/buku/cetak-stiker?bukuId=${item.id}`}
                          title="Cetak Stiker Label QR Buku Ini"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-line bg-paper hover:bg-paper-sunken text-ink font-medium transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5 text-status-tersedia" />
                          <span>Cetak QR</span>
                        </a>

                        <button
                          onClick={() => bukaModalEditBuku(item)}
                          title="Edit Informasi Buku"
                          className="p-1.5 rounded border border-line bg-paper hover:bg-paper-sunken text-ink-muted hover:text-ink transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setBukuAkanDihapus(item)}
                          title="Hapus Buku"
                          className="p-1.5 rounded border border-line bg-paper hover:bg-danger/10 text-ink-muted hover:text-danger transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CARI BUKU ONLINE (GOOGLE BOOKS & OPEN LIBRARY)                   */}
      {/* ========================================================================= */}
      {modalOnlineBuka && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in print:hidden">
          <div className="bg-surface border border-line rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-ink">
                  Cari Buku Online & Pelajaran Nasional
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Terintegrasi resmi dengan <strong>SIBI Kemendikbudristek (Kurikulum Merdeka)</strong>, Katalog Buku Indonesia, dan Google Books.
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
                placeholder="Ketik judul buku pelajaran (mis. Matematika Kelas 7, Bahasa Indonesia) atau nomor ISBN..."
                className="flex-1 px-4 py-2.5 rounded-lg border border-line text-sm focus:border-ink font-sans"
                autoFocus
              />
              <button
                type="submit"
                disabled={loadingOnline || !queryOnline.trim()}
                className="px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 disabled:opacity-50 min-h-[44px]"
              >
                {loadingOnline ? "Mencari..." : "Cari Buku"}
              </button>
            </form>

            <div className="flex-1 overflow-y-auto divide-y divide-line/60">
              {hasilOnline.length === 0 ? (
                <div className="py-12 text-center text-xs text-ink-muted">
                  Masukkan kata kunci judul pelajaran atau nomor ISBN untuk mengambil data buku secara otomatis.
                </div>
              ) : (
                hasilOnline.map((item, idx) => (
                  <div key={idx} className="py-3.5 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 max-w-xl">
                      <div className="w-12 shrink-0">
                        <BookCover
                          judul={item.judul}
                          penulis={item.penulis}
                          sampulUrl={item.sampulUrl}
                          className="p-1.5 text-[8px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.sumber === "kemendikbud_sibi" && (
                            <span className="inline-block font-mono text-[9px] uppercase tracking-wider bg-group-pelajaran text-white px-2 py-0.5 rounded font-bold shadow-xs">
                              Kemendikbud SIBI • Kurikulum Merdeka
                            </span>
                          )}
                          {item.sumber === "buku_indonesia" && (
                            <span className="inline-block font-mono text-[9px] uppercase tracking-wider bg-status-tersedia text-white px-2 py-0.5 rounded font-bold shadow-xs">
                              Katalog Buku Indonesia
                            </span>
                          )}
                          {item.sumber === "google_books" && (
                            <span className="inline-block font-mono text-[9px] uppercase tracking-wider bg-paper-sunken text-ink px-1.5 py-0.5 rounded font-medium">
                              Google Books
                            </span>
                          )}
                          {item.isbn && (
                            <span className="inline-block font-mono text-[10px] bg-paper-sunken px-2 py-0.5 rounded text-ink font-semibold">
                              ISBN: {item.isbn}
                            </span>
                          )}
                        </div>
                        <h4 className="font-serif font-bold text-sm text-ink">{item.judul}</h4>
                        <p className="text-xs text-ink-muted">
                          Penulis: {item.penulis} • Penerbit: {item.penerbit} ({item.tahunTerbit || "-"})
                        </p>
                        {item.sinopsis && (
                          <p className="text-xs text-ink-muted/80 line-clamp-2 leading-relaxed">{item.sinopsis}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handlePilihBukuOnline(item)}
                      className="px-3.5 py-2 rounded-lg bg-group-hiburan text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:brightness-105 shrink-0 min-h-[38px] shadow-sm"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Pilih Buku</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FORM TAMBAH / EDIT BUKU & PRATINJAU SAMPUL                       */}
      {/* ========================================================================= */}
      {modalFormBuka && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in print:hidden">
          <div className="bg-surface border border-line rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-ink">
                  {modeForm === "edit" ? "Edit Informasi Buku" : "Tambah Buku ke Katalog"}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {modeForm === "edit"
                    ? "Perbarui metadata, kategori, sampul, atau lokasi rak buku."
                    : "Isi data buku dan tentukan jumlah eksemplar fisik yang akan dibuat otomatis."}
                </p>
              </div>
              <button
                onClick={() => setModalFormBuka(false)}
                className="p-1 rounded text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Peringatan jika ISBN sudah ada di katalog */}
            {bukuDuplikatIsbn && (
              <div className="mb-4 p-3.5 rounded-lg bg-status-dipinjam/10 border border-status-dipinjam/30 flex items-center justify-between gap-4">
                <div className="text-xs text-ink">
                  <strong className="font-semibold block text-status-dipinjam">
                    ISBN ini sudah terdaftar pada buku &ldquo;{bukuDuplikatIsbn.judul}&rdquo;
                  </strong>
                  <span>
                    Jika Anda hanya ingin menambah stok fisik buku tersebut, gunakan fitur Tambah Eksemplar.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalFormBuka(false);
                    bukaModalEksemplar(bukuDuplikatIsbn, false);
                  }}
                  className="px-3 py-1.5 rounded bg-ink text-paper text-xs font-semibold shrink-0"
                >
                  Tambah Eksemplar Saja
                </button>
              </div>
            )}

            <form onSubmit={handleSimpanBuku} className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Kolom Kiri: Pratinjau & Unggah Sampul Manual (Otomatis Kompresi WebP) */}
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-ink-muted">
                    Sampul Buku (Rasio 2:3 • Auto WebP)
                  </label>

                  {/* Input berkas tersembunyi */}
                  <input
                    ref={inputFileSampulRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUnggahBerkasSampul(file);
                    }}
                  />

                  {/* Area Pratinjau + Drag & Drop */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragAktifSampul(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragAktifSampul(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragAktifSampul(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleUnggahBerkasSampul(file);
                    }}
                    onClick={() => {
                      if (!sedangUnggahSampul) inputFileSampulRef.current?.click();
                    }}
                    title="Klik atau tarik gambar sampul ke sini untuk mengunggah"
                    className={`relative w-40 mx-auto md:mx-0 rounded-lg cursor-pointer group transition-all ${
                      dragAktifSampul
                        ? "ring-2 ring-group-hiburan ring-offset-2 scale-[1.02]"
                        : "hover:ring-2 hover:ring-ink/30 hover:ring-offset-2"
                    }`}
                  >
                    <BookCover
                      judul={formJudul || "Judul Buku"}
                      penulis={formPenulis || "Nama Penulis"}
                      kelompok={kategoriTerpilihObj?.kelompok || "hiburan"}
                      sampulUrl={formSampulUrl || null}
                    />

                    {/* Overlay Interaktif Saat Hover / Drag / Sedang Kompresi */}
                    <div
                      className={`absolute inset-0 rounded-md flex flex-col items-center justify-center p-3 text-center transition-opacity z-30 ${
                        sedangUnggahSampul || dragAktifSampul
                          ? "bg-ink/75 opacity-100"
                          : "bg-ink/60 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {sedangUnggahSampul ? (
                        <>
                          <Sparkles className="w-6 h-6 text-white animate-spin mb-1.5" />
                          <span className="text-[11px] font-semibold text-white leading-tight">
                            Mengompresi ke WebP...
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-white mb-1.5" />
                          <span className="text-[11px] font-semibold text-white leading-tight">
                            {formSampulUrl ? "Klik / Tarik Foto untuk Ganti" : "Klik / Tarik Foto Sampul"}
                          </span>
                          <span className="text-[9px] text-white/80 mt-0.5">
                            Otomatis jadi .webp ringan
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badge Info Kompresi WebP */}
                  {infoKompresiSampul ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-status-tersedia/10 border border-status-tersedia/30 text-status-tersedia text-[11px] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        WebP • {infoKompresiSampul.ukuranWebpKb} KB
                        {infoKompresiSampul.hematPersen > 0
                          ? ` (Hemat ${infoKompresiSampul.hematPersen}%)`
                          : ""}
                      </span>
                    </div>
                  ) : formSampulUrl?.endsWith(".webp") ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-paper-sunken border border-line text-ink-muted text-[10px] font-mono">
                      <ImageIcon className="w-3 h-3 shrink-0 text-status-tersedia" />
                      <span>Tersimpan: Format .webp ringan</span>
                    </div>
                  ) : null}

                  {/* Tombol Aksi Unggah / Hapus Sampul */}
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={sedangUnggahSampul}
                      onClick={() => inputFileSampulRef.current?.click()}
                      className="w-full px-3 py-2 rounded-lg border border-line bg-paper hover:bg-paper-sunken text-ink text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 btn-tactile"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {sedangUnggahSampul
                          ? "Memproses WebP..."
                          : formSampulUrl
                          ? "Ganti Foto Sampul"
                          : "Pilih Foto Sampul"}
                      </span>
                    </button>

                    {formSampulUrl && (
                      <button
                        type="button"
                        disabled={sedangUnggahSampul}
                        onClick={() => {
                          setFormSampulUrl("");
                          setInfoKompresiSampul(null);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-status-hilang/25 text-status-hilang hover:bg-status-hilang/5 text-[11px] font-medium inline-flex items-center justify-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Gunakan Sampul Tipografi</span>
                      </button>
                    )}

                    <p className="text-[10px] text-ink-muted leading-relaxed">
                      Mendukung JPG/PNG/WebP. Gambar otomatis dipotong rasio 2:3 & dikompresi ke{" "}
                      <strong className="text-ink">.webp (~20 KB)</strong> agar katalog tetap ringan.
                    </p>
                  </div>
                </div>

                {/* Kolom Kanan: Field Metadata */}
                <div className="md:col-span-2 grid grid-cols-2 gap-3.5">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-ink-muted mb-1">
                      Judul Buku *
                    </label>
                    <input
                      type="text"
                      required
                      value={formJudul}
                      onChange={(e) => setFormJudul(e.target.value)}
                      placeholder="Contoh: Laskar Pelangi"
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
                      placeholder="Contoh: Andrea Hirata"
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
                      placeholder="Contoh: Bentang Pustaka"
                      className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1">
                      ISBN (Boleh dengan atau tanpa strip)
                    </label>
                    <input
                      type="text"
                      value={formIsbn}
                      onChange={(e) => setFormIsbn(e.target.value)}
                      placeholder="978-602-291-662-8"
                      className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1">
                        Tahun Terbit
                      </label>
                      <input
                        type="number"
                        value={formTahun}
                        onChange={(e) => setFormTahun(e.target.value ? Number(e.target.value) : "")}
                        placeholder="2024"
                        className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1">
                        Jml Halaman
                      </label>
                      <input
                        type="number"
                        value={formHalaman}
                        onChange={(e) =>
                          setFormHalaman(e.target.value ? Number(e.target.value) : "")
                        }
                        placeholder="320"
                        className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1">
                      Kategori Buku *
                    </label>
                    <select
                      value={formKategoriId}
                      onChange={(e) => setFormKategoriId(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink bg-white"
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
                      Lokasi Rak
                    </label>
                    <input
                      type="text"
                      value={formLokasiRak}
                      onChange={(e) => setFormLokasiRak(e.target.value)}
                      placeholder="Contoh: R-01-A"
                      className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink font-mono"
                    />
                  </div>

                  {modeForm === "tambah" && (
                    <div className="col-span-2 bg-paper-sunken/60 p-3 rounded-lg border border-line flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-ink">
                          Jumlah Eksemplar Fisik yang Dibuat *
                        </label>
                        <p className="text-[11px] text-ink-muted">
                          Sistem otomatis membuat kode unik berurutan (BB-000XXX) siap cetak QR.
                        </p>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        required
                        value={formJumlahEksemplar}
                        onChange={(e) => setFormJumlahEksemplar(Number(e.target.value))}
                        className="w-24 px-3 py-2 rounded border border-line text-sm bg-white focus:border-ink font-mono font-bold text-center"
                      />
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-ink-muted mb-1">
                      Sinopsis / Ringkasan Isi Buku
                    </label>
                    <textarea
                      rows={3}
                      value={formSinopsis}
                      onChange={(e) => setFormSinopsis(e.target.value)}
                      placeholder="Ringkasan singkat isi buku..."
                      className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                    />
                  </div>
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
                  {isSubmitting
                    ? "Menyimpan..."
                    : modeForm === "edit"
                      ? "Simpan Perubahan Buku"
                      : "Simpan Buku & Buat Eksemplar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: KELOLA EKSEMPLAR FISIK & CETAK STIKER QR BUKU                    */}
      {/* ========================================================================= */}
      {modalEksemplarBuka && detailBukuAktif && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in print:p-0 print:bg-white print:static print:block">
          <div className="bg-surface border border-line rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] print:border-none print:shadow-none print:h-auto print:max-h-none print:max-w-none print:w-full print:p-0 print:overflow-visible">
            {/* Header Modal - Tersembunyi saat Cetak */}
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4 print:hidden">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-ink text-paper">
                    Rak: {detailBukuAktif.lokasiRak || "Umum"}
                  </span>
                  <h3 className="font-serif font-bold text-xl text-ink">
                    {detailBukuAktif.judul}
                  </h3>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  Penulis: {detailBukuAktif.penulis} • Total {daftarEksemplarAktif.length} Unit Eksemplar Fisik
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setModeCetakStiker(!modeCetakStiker);
                    setEksemplarCetakTerpilih(null);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors ${
                    modeCetakStiker
                      ? "bg-ink text-paper border-ink"
                      : "bg-paper text-ink border-line hover:bg-paper-sunken"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>{modeCetakStiker ? "Lihat Tabel Unit" : "Pratinjau Semua Stiker QR"}</span>
                </button>
                <button
                  onClick={() => setModalEksemplarBuka(false)}
                  className="p-1 rounded text-ink-muted hover:text-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingEksemplar ? (
              <div className="py-12 text-center font-mono text-xs text-ink-muted print:hidden">
                Memuat daftar unit eksemplar...
              </div>
            ) : modeCetakStiker ? (
              /* TAMPILAN LEMBAR STIKER QR BUKU SIAP CETAK (65mm x 35mm per stiker) */
              <div className="flex-1 overflow-y-auto space-y-4 print:overflow-visible print:p-0">
                {/* Toolbar Pratinjau - Tersembunyi saat Cetak */}
                <div className="flex items-center justify-between bg-paper-sunken/70 p-3.5 rounded-lg border border-line print:hidden">
                  <p className="text-xs text-ink">
                    Menampilkan{" "}
                    <strong>
                      {(eksemplarCetakTerpilih || daftarEksemplarAktif).length} label stiker QR
                    </strong>{" "}
                    format standar perpustakaan (siap tempel di punggung & sampul buku).
                  </p>
                  <div className="flex items-center gap-2">
                    {eksemplarCetakTerpilih && (
                      <button
                        onClick={() => setEksemplarCetakTerpilih(null)}
                        className="px-3 py-1.5 rounded border border-line bg-white text-xs font-medium"
                      >
                        Tampilkan Semua Unit
                      </button>
                    )}
                    <a
                      href={`/admin/buku/cetak-stiker?bukuId=${detailBukuAktif.id}${
                        eksemplarCetakTerpilih
                          ? `&ids=${eksemplarCetakTerpilih.map((e) => e.id).join(",")}`
                          : ""
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-paper-sunken text-ink text-xs font-semibold shadow-xs"
                      title="Buka halaman cetak mandiri tanpa gangguan elemen latar belakang"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Lembar Mandiri</span>
                    </a>
                    <button
                      onClick={cetakStikerTerisolasi}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Lembar Stiker</span>
                    </button>
                  </div>
                </div>

                {/* Lembar Stiker Fisik: Grid 3 Kolom Presisi Standar Perpustakaan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-2 print:grid-cols-3 print:gap-[3mm] print:p-0 print:max-w-none">
                  {(eksemplarCetakTerpilih || daftarEksemplarAktif).map((eks) => (
                    <div
                      key={eks.id}
                      className="border border-dashed border-neutral-600 print:border-black bg-white flex flex-col justify-between overflow-hidden print-card-unit break-inside-avoid"
                      style={{ height: "32mm" }}
                    >
                      {/* Kop Hitam Stiker */}
                      <div
                        className="bg-black text-white px-2.5 flex items-center justify-between shrink-0"
                        style={{ height: "5.5mm" }}
                      >
                        <span className="font-sans font-bold text-[7pt] tracking-wider uppercase leading-none">
                          PERPUSTAKAAN NETRI
                        </span>
                        <span className="font-mono font-bold text-[7pt] tracking-tight uppercase leading-none">
                          RAK: {detailBukuAktif.lokasiRak || "UMUM"}
                        </span>
                      </div>

                      {/* Isi Stiker: QR + Metadata */}
                      <div
                        className="flex items-center gap-2.5 px-2 py-1.5 flex-1 min-h-0 bg-white"
                        style={{ height: "26.5mm" }}
                      >
                        <div
                          className="p-0.5 bg-white border border-black shrink-0 flex items-center justify-center"
                          style={{ width: "21mm", height: "21mm" }}
                        >
                          <img
                            src={`/api/v1/admin/qr?tipe=buku&id=${eks.id}`}
                            alt={eks.kode}
                            className="w-full h-full object-contain block"
                          />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col justify-between h-[21mm]">
                          <div className="border-b border-black/40 pb-0.5">
                            <span className="font-mono font-extrabold text-[10pt] text-black tracking-tight block leading-none">
                              {eks.kode}
                            </span>
                          </div>
                          <p className="font-serif font-bold text-[8pt] text-black line-clamp-2 leading-[1.15] my-auto">
                            {detailBukuAktif.judul}
                          </p>
                          <p className="font-sans text-[6.5pt] text-neutral-700 truncate border-t border-black/15 pt-0.5 leading-none">
                            {detailBukuAktif.penulis}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* TAMPILAN TABEL MANAJEMEN UNIT EKSEMPLAR - Tersembunyi saat Cetak */
              <div className="flex-1 overflow-y-auto space-y-4 print:hidden">
                {/* Bar Tambah Stok Eksemplar */}
                <form
                  onSubmit={handleTambahEksemplar}
                  className="bg-paper-sunken/60 p-3.5 rounded-xl border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="font-serif font-bold text-sm text-ink">
                      Tambah Stok Unit Eksemplar Baru
                    </h4>
                    <p className="text-xs text-ink-muted">
                      Gunakan ini jika perpustakaan menerima tambahan eksemplar fisik untuk judul yang sama.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={jumlahTambahEks}
                      onChange={(e) => setJumlahTambahEks(Number(e.target.value))}
                      className="w-20 px-3 py-2 rounded-lg border border-line bg-white font-mono text-xs font-bold text-center"
                    />
                    <button
                      type="submit"
                      disabled={isAddingEks}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isAddingEks ? "Menambahkan..." : "Tambah Unit"}</span>
                    </button>
                  </div>
                </form>

                {/* Daftar Tabel Eksemplar */}
                <div className="border border-line rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-paper-sunken/50 border-b border-line font-sans text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
                        <th className="py-3 px-4">Kode Barcode / QR</th>
                        <th className="py-3 px-4">Status Saat Ini</th>
                        <th className="py-3 px-4">Informasi Peminjam</th>
                        <th className="py-3 px-4 text-right">Ubah Kondisi / Cetak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {daftarEksemplarAktif.map((eks) => (
                        <tr key={eks.id} className="hover:bg-paper-sunken/20">
                          <td className="py-3 px-4 font-mono font-bold text-sm text-ink">
                            {eks.kode}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase font-mono ${
                                eks.status === "tersedia"
                                  ? "bg-status-tersedia/15 text-status-tersedia"
                                  : eks.status === "dipinjam"
                                    ? "bg-status-dipinjam/15 text-status-dipinjam"
                                    : "bg-danger/15 text-danger"
                              }`}
                            >
                              {eks.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-ink-muted">
                            {eks.status === "dipinjam" && eks.peminjamNama ? (
                              <div>
                                <strong className="text-ink">{eks.peminjamNama}</strong> (
                                {eks.peminjamKelas || eks.peminjamNis})
                                <span className="block font-mono text-[10px]">
                                  Jatuh Tempo:{" "}
                                  {new Date(eks.jatuhTempo).toLocaleDateString("id-ID")}
                                </span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              {eks.status !== "dipinjam" && (
                                <select
                                  value={eks.status}
                                  onChange={(e) =>
                                    handleUbahStatusEksemplar(
                                      eks.id,
                                      e.target.value as "tersedia" | "rusak" | "hilang"
                                    )
                                  }
                                  className="px-2 py-1 rounded border border-line bg-white text-xs font-medium"
                                >
                                  <option value="tersedia">Tersedia</option>
                                  <option value="rusak">Rusak</option>
                                  <option value="hilang">Hilang</option>
                                </select>
                              )}

                              <button
                                onClick={() => {
                                  setEksemplarCetakTerpilih([eks]);
                                  setModeCetakStiker(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-line bg-paper hover:bg-paper-sunken text-ink font-medium"
                              >
                                <QrCode className="w-3.5 h-3.5 text-status-tersedia" />
                                <span>Stiker QR</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TAMBAH KATEGORI CEPAT                                            */}
      {/* ========================================================================= */}
      {modalKategoriBuka && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in print:hidden">
          <div className="bg-surface border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-serif font-bold text-lg text-ink">Tambah Kategori Buku Baru</h3>
              <button
                onClick={() => setModalKategoriBuka(false)}
                className="p-1 rounded text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimpanKategoriBaru} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  Kelompok Koleksi *
                </label>
                <select
                  value={katKelompokBaru}
                  onChange={(e) => setKatKelompokBaru(e.target.value as "hiburan" | "pelajaran")}
                  className="w-full px-3 py-2 rounded border border-line text-sm bg-white"
                >
                  <option value="hiburan">Bacaan Hiburan (Novel, Cerpen, Komik, Sains Populer)</option>
                  <option value="pelajaran">Buku Pelajaran (Kurikulum Sekolah)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">
                  Nama Kategori *
                </label>
                <input
                  type="text"
                  required
                  value={katNamaBaru}
                  onChange={(e) => setKatNamaBaru(e.target.value)}
                  placeholder="Contoh: Ensiklopedia / Biologi Kelas IX"
                  className="w-full px-3 py-2 rounded border border-line text-sm focus:border-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalKategoriBuka(false)}
                  className="px-4 py-2 rounded text-xs font-medium text-ink-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingKategori}
                  className="px-5 py-2 rounded-lg bg-ink text-paper text-xs font-semibold"
                >
                  {isSavingKategori ? "Menyimpan..." : "Simpan Kategori"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: KONFIRMASI HAPUS BUKU                                            */}
      {/* ========================================================================= */}
      {bukuAkanDihapus && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in print:hidden">
          <div className="bg-surface border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-danger">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-serif font-bold text-lg text-ink">Hapus Buku dari Katalog?</h3>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Apakah Anda yakin ingin menghapus buku{" "}
              <strong className="text-ink">&ldquo;{bukuAkanDihapus.judul}&rdquo;</strong> karya{" "}
              {bukuAkanDihapus.penulis}? Buku yang masih memiliki pinjaman aktif tidak dapat dihapus.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                onClick={() => setBukuAkanDihapus(null)}
                className="px-4 py-2 rounded text-xs font-medium text-ink-muted hover:text-ink"
              >
                Batal
              </button>
              <button
                onClick={handleKonfirmasiHapus}
                disabled={isDeleting}
                className="px-5 py-2 rounded-lg bg-danger text-white text-xs font-semibold hover:bg-danger/90 disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Buku"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
