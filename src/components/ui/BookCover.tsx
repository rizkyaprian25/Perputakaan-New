/**
 * Komponen Sampul Buku (Rasio 2:3)
 * Mencegah layout shift (CLS < 0.1).
 * Jika gambar tidak tersedia, merender blok warna kelompok (Hiburan vs Pelajaran)
 * dengan judul bertipografi Newsreader serif putih dan nama penulis di bawah.
 */

import { cn } from "@/lib/utils";
import { KelompokKategori } from "@/contracts/konstanta";

interface BookCoverProps {
  judul: string;
  penulis: string;
  kelompok?: KelompokKategori;
  sampulUrl?: string | null;
  className?: string;
  priority?: boolean;
}

export function BookCover({
  judul,
  penulis,
  kelompok = "hiburan",
  sampulUrl,
  className,
}: BookCoverProps) {
  const isPelajaran = kelompok === "pelajaran";

  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full rounded-md overflow-hidden border border-line flex flex-col justify-between p-4 select-none book-spine-effect transition-all duration-200",
        isPelajaran
          ? "bg-gradient-to-br from-group-pelajaran to-[#14328c] text-on-group"
          : "bg-gradient-to-br from-group-hiburan to-[#942a04] text-on-group",
        className
      )}
    >
      {/* Lapisan Dasar: Sampul Pengganti Bertipografi Editorial (Khas Perpustakaan NETRI) */}
      <div className="flex flex-col gap-1.5 z-10">
        <span className="font-mono text-[9px] tracking-widest uppercase opacity-85 px-1.5 py-0.5 rounded bg-black/20 w-fit">
          {isPelajaran ? "Buku Pelajaran" : "Buku Bacaan"}
        </span>
        <h3 className="font-serif font-medium text-base sm:text-lg leading-tight line-clamp-3 tracking-normal">
          {judul}
        </h3>
      </div>
      <p className="font-sans text-xs opacity-90 line-clamp-2 z-10 font-normal tracking-wide">
        {penulis}
      </p>

      {/* Efek Punggung Buku Realistis (Spine Shadow & Highlight di Sisi Kiri) */}
      <div
        className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 via-black/15 to-transparent pointer-events-none z-30"
        aria-hidden="true"
      />
      <div
        className="absolute inset-y-0 left-3 w-px bg-white/15 pointer-events-none z-30"
        aria-hidden="true"
      />

      {/* Lapisan Atas: Gambar Sampul Asli jika tersedia */}
      {sampulUrl && (
        <img
          src={sampulUrl}
          alt={`Sampul buku ${judul}`}
          className="absolute inset-0 w-full h-full object-cover z-20 bg-paper-sunken"
          loading="lazy"
        />
      )}
    </div>
  );
}
