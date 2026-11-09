import type { Metadata, Viewport } from "next";
import { Newsreader, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { PwaSyncProvider } from "@/components/ui/PwaSyncProvider";
import "./globals.css";

// Tipografi Editorial Literasi: Newsreader (Variable Serif Font)
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

// Tipografi Antarmuka Modern: Plus Jakarta Sans (Variable Sans-Serif Font)
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

// Tipografi Monospace & Tabular: JetBrains Mono (Variable Monospace Font)
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Perpustakaan NETRI — Sistem Katalog, Presensi & Sirkulasi Sekolah",
  description:
    "Katalog buku pelajaran & literasi Perpustakaan NETRI, anjungan presensi mandiri siswa, dan workstation sirkulasi peminjaman cepat.",
  applicationName: "Perpustakaan NETRI",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Perpustakaan NETRI",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#141312",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${newsreader.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased selection:bg-ink selection:text-paper font-sans">
        <PwaSyncProvider />
        {children}
      </body>
    </html>
  );
}
