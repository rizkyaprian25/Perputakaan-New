import type { MetadataRoute } from "next";

/**
 * Perpustakaan NETRI — Konfigurasi Web App Manifest (PWA)
 * Tersinkronisasi penuh dengan palet Modern Crisp Library, ikon multi-resolusi,
 * dan jalan pintas (shortcuts) untuk Katalog, Kiosk Presensi, dan Meja Sirkulasi.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?app=perpustakaan-netri",
    name: "Perpustakaan NETRI — Sistem Perpustakaan Sekolah",
    short_name: "Perpustakaan NETRI",
    description:
      "Katalog buku pelajaran & literasi Perpustakaan NETRI, anjungan presensi mandiri siswa, dan workstation sirkulasi peminjaman cepat.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#FBF9F5",
    theme_color: "#141312",
    categories: ["education", "books", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "Katalog Buku Publik",
        short_name: "Katalog",
        description: "Cari buku pelajaran & bacaan di Perpustakaan NETRI",
        url: "/",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Kiosk Presensi Siswa",
        short_name: "Kiosk Presensi",
        description: "Buka layar anjungan presensi mandiri siswa",
        url: "/kiosk",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Meja Sirkulasi Admin",
        short_name: "Sirkulasi",
        description: "Buka workstation peminjaman & pengembalian buku",
        url: "/admin/sirkulasi",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
