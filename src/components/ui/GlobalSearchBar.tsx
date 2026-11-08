"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function GlobalSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const querySaatIni = searchParams.get("q") || "";
  const [kataKunci, setKataKunci] = useState(querySaatIni);

  useEffect(() => {
    setKataKunci(querySaatIni);
  }, [querySaatIni]);

  // Micro-Interaksi: Tekan '/' di mana saja (di luar input aktif) untuk langsung fokus ke kotak pencarian
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "/" && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const queryBersih = kataKunci.trim();

    if (!queryBersih) {
      // Jika input kosong, hapus q dari URL
      if (pathname.startsWith("/katalog/")) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("q");
        router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
      } else {
        router.push("/");
      }
      return;
    }

    // Jika sedang di halaman kelompok katalog, pertahankan filter kelompok
    if (pathname.startsWith("/katalog/")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", queryBersih);
      router.push(`${pathname}?${params.toString()}`);
    } else {
      // Jika di beranda atau halaman lain, arahkan ke beranda dengan query pencarian global
      router.push(`/?q=${encodeURIComponent(queryBersih)}`);
    }
  };

  const handleBersihkan = () => {
    setKataKunci("");
    if (querySaatIni) {
      if (pathname.startsWith("/katalog/")) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("q");
        router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
      } else {
        router.push("/");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full group">
      <Search className="w-4 h-4 text-ink-muted group-focus-within:text-ink absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
      <input
        ref={inputRef}
        type="text"
        value={kataKunci}
        onChange={(e) => setKataKunci(e.target.value)}
        placeholder="Cari judul buku, penulis, atau ISBN... (Tekan '/' untuk fokus)"
        className="w-full pl-10 pr-16 py-2.5 rounded-lg border border-line bg-surface text-sm text-ink placeholder:text-ink-muted/70 focus:border-ink focus:ring-2 focus:ring-ink/15 transition-all"
      />
      {kataKunci ? (
        <button
          type="button"
          onClick={handleBersihkan}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1 rounded transition-colors"
          title="Hapus kata kunci"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-ink-muted bg-paper-sunken border border-line rounded absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          /
        </kbd>
      )}
    </form>
  );
}
