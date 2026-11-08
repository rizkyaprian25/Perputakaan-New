"use client";

/**
 * Perpustakaan NETRI - Halaman Pengaturan Sistem Perpustakaan & Manajemen Staf
 * 1. Aturan operasional peminjaman, batas denda keterlambatan, dan kuota buku.
 * 2. Ubah kata sandi akun yang sedang aktif.
 * 3. Manajemen akun petugas piket (tambah akun staf & status aktif).
 */

import { useState, useEffect } from "react";
import { Save, CheckCircle2, AlertCircle, RotateCcw, Lock, KeyRound, UserPlus, Shield, Users, X } from "lucide-react";

export default function AdminPengaturanPage() {
  const [tabPengaturan, setTabPengaturan] = useState<"operasional" | "keamanan" | "staf">("operasional");

  // State Pengaturan Operasional
  const [lamaPinjamHari, setLamaPinjamHari] = useState(7);
  const [maksBukuPerAnggota, setMaksBukuPerAnggota] = useState(3);
  const [dendaPerHariRp, setDendaPerHariRp] = useState(1000);
  const [namaPerpustakaan, setNamaPerpustakaan] = useState("Perpustakaan NETRI");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State Ubah Kata Sandi
  const [passLama, setPassLama] = useState("");
  const [passBaru, setPassBaru] = useState("");
  const [passKonfirmasi, setPassKonfirmasi] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // State Manajemen Staf
  const [daftarPengguna, setDaftarPengguna] = useState<any[]>([]);
  const [loadingPengguna, setLoadingPengguna] = useState(false);
  const [modalTambahStaf, setModalTambahStaf] = useState(false);
  const [usernameStaf, setUsernameStaf] = useState("");
  const [passwordStaf, setPasswordStaf] = useState("");
  const [peranStaf, setPeranStaf] = useState<"petugas" | "admin">("petugas");
  const [savingStaf, setSavingStaf] = useState(false);

  const [toast, setToast] = useState<{ tipe: "sukses" | "error"; pesan: string } | null>(null);

  const tampilkanToast = (pesan: string, tipe: "sukses" | "error") => {
    setToast({ pesan, tipe });
    setTimeout(() => setToast(null), 4000);
  };

  const muatPengaturan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/pengaturan");
      const json = await res.json();
      if (json.sukses && Array.isArray(json.data)) {
        for (const item of json.data) {
          if (item.kunci === "lama_pinjam_hari") setLamaPinjamHari(Number(item.nilai || 7));
          if (item.kunci === "maks_buku_per_anggota")
            setMaksBukuPerAnggota(Number(item.nilai || 3));
          if (item.kunci === "denda_per_hari_rp") setDendaPerHariRp(Number(item.nilai || 0));
          if (item.kunci === "nama_perpustakaan") setNamaPerpustakaan(item.nilai);
        }
      }
    } catch {
      tampilkanToast("Gagal memuat pengaturan sistem", "error");
    } finally {
      setLoading(false);
    }
  };

  const muatPengguna = async () => {
    setLoadingPengguna(true);
    try {
      const res = await fetch("/api/v1/admin/pengguna");
      const json = await res.json();
      if (json.sukses) {
        setDaftarPengguna(json.data);
      }
    } catch {
      // Abaikan jika bukan admin
    } finally {
      setLoadingPengguna(false);
    }
  };

  useEffect(() => {
    muatPengaturan();
    muatPengguna();
  }, []);

  // Simpan Pengaturan Operasional
  const handleSimpanOperasional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lamaPinjamHari: Number(lamaPinjamHari),
          maksBukuPerAnggota: Number(maksBukuPerAnggota),
          dendaPerHariRp: Number(dendaPerHariRp),
          namaPerpustakaan: namaPerpustakaan.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal menyimpan pengaturan");
      }

      tampilkanToast(json.pesan, "sukses");
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Simpan Ubah Kata Sandi
  const handleSimpanPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingPassword) return;

    if (passBaru !== passKonfirmasi) {
      tampilkanToast("Konfirmasi kata sandi baru tidak cocok", "error");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/v1/admin/pengguna/ganti-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passwordLama: passLama,
          passwordBaru: passBaru,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal memperbarui kata sandi");
      }

      tampilkanToast(json.pesan, "sukses");
      setPassLama("");
      setPassBaru("");
      setPassKonfirmasi("");
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setSavingPassword(false);
    }
  };

  // Tambah Staf Baru
  const handleTambahStaf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingStaf) return;

    setSavingStaf(true);
    try {
      const res = await fetch("/api/v1/admin/pengguna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameStaf.trim(),
          kataSandi: passwordStaf,
          peran: peranStaf,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal membuat akun staf");
      }

      tampilkanToast(json.pesan, "sukses");
      setModalTambahStaf(false);
      setUsernameStaf("");
      setPasswordStaf("");
      muatPengguna();
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    } finally {
      setSavingStaf(false);
    }
  };

  // Ubah Status Aktif Staf
  const handleToggleStatusStaf = async (id: string, statusSaatIni: boolean) => {
    try {
      const res = await fetch("/api/v1/admin/pengguna", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, aktif: !statusSaatIni }),
      });

      const json = await res.json();
      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Gagal mengubah status staf");
      }

      tampilkanToast(json.pesan, "sukses");
      muatPengguna();
    } catch (err: any) {
      tampilkanToast(err.message, "error");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
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

      {/* Header Halaman Pengaturan */}
      <div className="border-b border-line pb-5">
        <h1 className="font-serif text-3xl font-semibold text-ink">
          Pengaturan Sistem & Keamanan
        </h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Aturan operasional peminjaman, kredensial akun staf, dan hak akses petugas perpustakaan.
        </p>

        {/* Tab Sub Navigasi */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setTabPengaturan("operasional")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tabPengaturan === "operasional"
                ? "bg-ink text-paper shadow-sm"
                : "bg-surface border border-line text-ink-muted hover:text-ink"
            }`}
          >
            Aturan Operasional
          </button>
          <button
            onClick={() => setTabPengaturan("keamanan")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tabPengaturan === "keamanan"
                ? "bg-ink text-paper shadow-sm"
                : "bg-surface border border-line text-ink-muted hover:text-ink"
            }`}
          >
            Ubah Kata Sandi
          </button>
          <button
            onClick={() => setTabPengaturan("staf")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tabPengaturan === "staf"
                ? "bg-ink text-paper shadow-sm"
                : "bg-surface border border-line text-ink-muted hover:text-ink"
            }`}
          >
            Akun Petugas ({daftarPengguna.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PENGATURAN OPERASIONAL                                            */}
      {/* ========================================================================= */}
      {tabPengaturan === "operasional" && (
        <form
          onSubmit={handleSimpanOperasional}
          className="bg-surface border border-line rounded-xl p-6 shadow-sm space-y-6"
        >
          {loading ? (
            <div className="py-10 text-center text-xs font-mono text-ink-muted">
              Memuat konfigurasi sistem...
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {/* Nama Perpustakaan */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="font-semibold text-sm text-ink block">
                    Nama Unit Perpustakaan
                  </label>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Ditampilkan pada kop bukti peminjaman dan kartu anggota.
                  </p>
                </div>
                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    value={namaPerpustakaan}
                    onChange={(e) => setNamaPerpustakaan(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-md border border-line bg-white text-sm focus:border-ink min-h-[42px]"
                    required
                  />
                </div>
              </div>

              {/* Lama Pinjam Hari */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="font-semibold text-sm text-ink block">
                    Durasi Standar Peminjaman (Hari)
                  </label>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Jumlah hari kalender sebelum buku berstatus jatuh tempo (`lama_pinjam_hari`).
                  </p>
                </div>
                <div className="w-full sm:w-48">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={lamaPinjamHari}
                    onChange={(e) => setLamaPinjamHari(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-md border border-line bg-white font-mono text-sm focus:border-ink min-h-[42px]"
                    required
                  />
                </div>
              </div>

              {/* Maksimal Buku Per Anggota */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="font-semibold text-sm text-ink block">
                    Kuota Maksimal Buku per Anggota
                  </label>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Batas jumlah eksemplar buku yang boleh dipinjam bersamaan oleh satu siswa (`maks_buku_per_anggota`).
                  </p>
                </div>
                <div className="w-full sm:w-48">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maksBukuPerAnggota}
                    onChange={(e) => setMaksBukuPerAnggota(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-md border border-line bg-white font-mono text-sm focus:border-ink min-h-[42px]"
                    required
                  />
                </div>
              </div>

              {/* Denda Per Hari */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="font-semibold text-sm text-ink block">
                    Tarif Denda Keterlambatan per Hari (Rp)
                  </label>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Isi 0 jika perpustakaan tidak menerapkan denda uang (`denda_per_hari_rp`).
                  </p>
                </div>
                <div className="w-full sm:w-48">
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    step={500}
                    value={dendaPerHariRp}
                    onChange={(e) => setDendaPerHariRp(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-md border border-line bg-white font-mono text-sm focus:border-ink min-h-[42px]"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-line flex justify-end gap-3">
            <button
              type="button"
              onClick={muatPengaturan}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-line bg-white hover:bg-paper-sunken text-ink text-xs font-semibold min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Muat Ulang</span>
            </button>
            <button
              type="submit"
              disabled={loading || saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-ink text-paper hover:bg-ink/90 text-xs font-semibold min-h-[44px] disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Menyimpan..." : "Simpan Pengaturan"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UBAH KATA SANDI SAYA                                              */}
      {/* ========================================================================= */}
      {tabPengaturan === "keamanan" && (
        <form
          onSubmit={handleSimpanPassword}
          className="bg-surface border border-line rounded-xl p-6 shadow-sm space-y-5 max-w-lg"
        >
          <div className="flex items-center gap-3 border-b border-line pb-3">
            <KeyRound className="w-5 h-5 text-group-hiburan" />
            <div>
              <h3 className="font-serif font-bold text-base text-ink">Ganti Kata Sandi Akun</h3>
              <p className="text-xs text-ink-muted">Gunakan kombinasi minimal 8 karakter yang aman</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Kata Sandi Saat Ini *
              </label>
              <input
                type="password"
                required
                value={passLama}
                onChange={(e) => setPassLama(e.target.value)}
                placeholder="Masukkan kata sandi lama Anda..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-white text-sm focus:border-ink font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Kata Sandi Baru *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={passBaru}
                onChange={(e) => setPassBaru(e.target.value)}
                placeholder="Minimal 8 karakter..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-white text-sm focus:border-ink font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Konfirmasi Kata Sandi Baru *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={passKonfirmasi}
                onChange={(e) => setPassKonfirmasi(e.target.value)}
                placeholder="Ulangi kata sandi baru..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-white text-sm focus:border-ink font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-line flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 disabled:opacity-50 min-h-[44px]"
            >
              <Lock className="w-4 h-4" />
              <span>{savingPassword ? "Memperbarui..." : "Perbarui Kata Sandi"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MANAJEMEN AKUN STAF / PETUGAS                                      */}
      {/* ========================================================================= */}
      {tabPengaturan === "staf" && (
        <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden space-y-4">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-group-pelajaran" />
              <h3 className="font-serif font-bold text-base text-ink">Daftar Akun Petugas Piket</h3>
            </div>

            <button
              onClick={() => setModalTambahStaf(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 min-h-[38px]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Petugas Baru</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-sunken/60 font-mono uppercase text-ink-muted border-b border-line">
                <tr>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Hak Akses (Peran)</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4">Terdaftar Pada</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {loadingPengguna ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-muted font-mono">
                      Memuat data petugas...
                    </td>
                  </tr>
                ) : daftarPengguna.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-muted">
                      Tidak ada akun staf lain selain admin utama.
                    </td>
                  </tr>
                ) : (
                  daftarPengguna.map((u) => (
                    <tr key={u.id} className="hover:bg-paper-sunken/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-ink">{u.username}</td>
                      <td className="py-3 px-4 capitalize font-medium text-ink">
                        {u.peran === "admin" ? "Administrator" : "Petugas Piket"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            u.aktif
                              ? "bg-status-tersedia/10 text-status-tersedia"
                              : "bg-danger/10 text-danger"
                          }`}
                        >
                          {u.aktif ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-ink-muted">
                        {new Date(u.dibuatPada).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleStatusStaf(u.id, u.aktif)}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                            u.aktif
                              ? "border border-danger/40 text-danger hover:bg-danger/10"
                              : "border border-status-tersedia/40 text-status-tersedia hover:bg-status-tersedia/10"
                          }`}
                        >
                          {u.aktif ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah Staf Baru */}
      {modalTambahStaf && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-serif font-bold text-lg text-ink">Tambah Akun Petugas Baru</h3>
              <button
                onClick={() => setModalTambahStaf(false)}
                className="p-1 rounded text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTambahStaf} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Username Petugas *
                </label>
                <input
                  type="text"
                  required
                  value={usernameStaf}
                  onChange={(e) => setUsernameStaf(e.target.value)}
                  placeholder="Contoh: petugas_siti"
                  className="w-full px-3.5 py-2 rounded-lg border border-line font-mono text-sm focus:border-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Kata Sandi Awal *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordStaf}
                  onChange={(e) => setPasswordStaf(e.target.value)}
                  placeholder="Minimal 8 karakter..."
                  className="w-full px-3.5 py-2 rounded-lg border border-line font-mono text-sm focus:border-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Peran & Hak Akses
                </label>
                <select
                  value={peranStaf}
                  onChange={(e: any) => setPeranStaf(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-line text-sm focus:border-ink"
                >
                  <option value="petugas">Petugas (Sirkulasi & Kiosk)</option>
                  <option value="admin">Administrator (Semua Akses)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalTambahStaf(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingStaf}
                  className="px-5 py-2.5 rounded-lg bg-ink text-paper text-xs font-semibold hover:bg-ink/90 disabled:opacity-50"
                >
                  {savingStaf ? "Menyimpan..." : "Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
