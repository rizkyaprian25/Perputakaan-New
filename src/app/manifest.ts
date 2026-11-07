import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bilik Baca - Sistem Perpustakaan Sekolah",
    short_name: "Bilik Baca",
    description: "Katalog buku sekolah, absensi kunjungan mandiri, dan sirkulasi peminjaman cepat untuk siswa dan guru.",
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
