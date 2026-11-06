/**
 * Komponen Sampul Buku (Rasio 2:3)
 * Mencegah layout shift (CLS < 0.1).
 * Jika gambar tidak tersedia, merender blok warna kelompok (Hiburan vs Pelajaran)
 * dengan judul bertipografi Fraunces serif putih (on-group) dan nama penulis di bawah.
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
        "relative aspect-[2/3] w-full rounded-md overflow-hidden border border-line flex flex-col justify-between p-4 shadow-sm select-none",
        isPelajaran ? "bg-group-pelajaran text-on-group" : "bg-group-hiburan text-on-group",
        className
      )}
    >
      {/* Lapisan Dasar: Sampul Pengganti Bertipografi Editorial (Khas Bilik Baca) */}
      <div className="flex flex-col gap-1 z-10">
        <span className="font-mono text-[10px] tracking-widest uppercase opacity-80">
          {isPelajaran ? "Buku Pelajaran" : "Buku Bacaan"}
        </span>
        <h3 className="font-serif font-semibold text-base sm:text-lg leading-tight line-clamp-3">
          {judul}
        </h3>
      </div>
      <p className="font-sans text-xs opacity-90 line-clamp-2 z-10 font-normal">
        {penulis}
      </p>

      {/* Pola Halus Punggung Buku Tekstur Kertas */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10 pointer-events-none"
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
