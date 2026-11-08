/**
 * Penanda Ketersediaan Eksemplar ("Punggung Buku")
 * Komponen khas Perpustakaan NETRI: deretan balok vertikal kecil (satu balok per eksemplar).
 * Terisi status-tersedia = ada, kosong berkontur line = dipinjam.
 * Selalu ditemani teks ringkas, tidak pernah mengandalkan warna saja (Aksesibel).
 */

import { cn } from "@/lib/utils";

interface BookSpineTickProps {
  total: number;
  tersedia: number;
  className?: string;
  showText?: boolean;
}

export function BookSpineTick({
  total,
  tersedia,
  className,
  showText = true,
}: BookSpineTickProps) {
  // Batasi render balok visual maksimal 10 agar tidak overflow di layar kecil
  const maxDisplayTicks = Math.min(total, 10);
  const rasioTersedia = total > 0 ? (tersedia / total) * maxDisplayTicks : 0;
  const jumlahTerisi = Math.round(rasioTersedia);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Deretan Balok Punggung Buku */}
      <div className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: maxDisplayTicks }).map((_, index) => {
          const isAvailable = index < jumlahTerisi;
          return (
            <span
              key={index}
              className={cn(
                "w-1.5 h-4 rounded-sm transition-colors",
                isAvailable ? "bg-status-tersedia" : "border border-line bg-transparent"
              )}
            />
          );
        })}
      </div>

      {/* Label Teks Penjelas */}
      {showText && (
        <span className="font-mono text-xs text-ink-muted">
          {tersedia > 0 ? (
            <>
              <strong className="text-ink font-semibold">{tersedia}</strong> dari {total} tersedia
            </>
          ) : (
            <span className="text-danger font-medium">Sedang dipinjam semua</span>
          )}
        </span>
      )}
    </div>
  );
}
