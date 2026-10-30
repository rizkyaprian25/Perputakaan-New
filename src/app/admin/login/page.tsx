"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, KeyRound, User, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !kataSandi.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, kataSandi }),
      });

      const json = await res.json();

      if (!res.ok || !json.sukses) {
        throw new Error(json.pesan || "Username atau kata sandi tidak cocok.");
      }

      // Login berhasil -> Arahkan ke panel utama
      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal masuk ke sistem";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface border border-line rounded-xl p-8 shadow-sm space-y-6">
        {/* Header Form */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-ink text-paper flex items-center justify-center font-serif font-bold text-2xl mx-auto shadow-sm">
            B
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink">Masuk Portal Staf</h1>
          <p className="text-xs text-ink-muted">
            Sistem Informasi & Meja Sirkulasi Perpustakaan Sekolah
          </p>
        </div>

        {/* Notifikasi Error */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Formulir Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="usernameInput"
              className="block text-xs font-semibold uppercase tracking-wider text-ink-muted"
            >
              Nama Pengguna (Username)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="usernameInput"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: admin atau petugas1"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-md border border-line bg-white text-sm text-ink focus:border-ink focus:ring-1 focus:ring-ink min-h-[44px]"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="passwordInput"
              className="block text-xs font-semibold uppercase tracking-wider text-ink-muted"
            >
              Kata Sandi
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="passwordInput"
                type="password"
                value={kataSandi}
                onChange={(e) => setKataSandi(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-md border border-line bg-white text-sm text-ink focus:border-ink focus:ring-1 focus:ring-ink min-h-[44px]"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username.trim() || !kataSandi.trim()}
            className="w-full py-3 px-4 rounded-md bg-ink text-paper font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-ink/90 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            {isSubmitting ? (
              <span>Memverifikasi kredensial...</span>
            ) : (
              <>
                <span>Masuk ke Panel Staf</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-line text-center">
          <Link
            href="/"
            className="text-xs text-ink-muted hover:text-ink transition-colors font-medium inline-block"
          >
            ← Kembali ke Katalog Publik Siswa
          </Link>
        </div>
      </div>
    </div>
  );
}
