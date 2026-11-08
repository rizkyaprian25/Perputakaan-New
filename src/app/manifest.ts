import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Perpustakaan NETRI — Sistem Perpustakaan Sekolah",
    short_name: "Perpustakaan NETRI",
    description: "Katalog buku sekolah, presensi kunjungan mandiri, dan sirkulasi peminjaman cepat Perpustakaan NETRI.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF9F5",
    theme_color: "#FBF9F5",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
