import type { Metadata, Viewport } from "next";
import { Newsreader, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
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
  title: "Bilik Baca - Sistem Perpustakaan Sekolah",
  description:
    "Katalog buku sekolah, absensi kunjungan mandiri, dan sirkulasi peminjaman cepat untuk siswa dan guru.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FBF9F5",
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Isolasi Origin: Bersihkan Service Worker dan Cache Storage dari aplikasi lain pada localhost (mis. PWA mystrava)
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (var r of registrations) {
                    r.unregister();
                  }
                });
              }
              if (typeof window !== 'undefined' && 'caches' in window) {
                caches.keys().then(function(keys) {
                  for (var k of keys) {
                    caches.delete(k);
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased selection:bg-ink selection:text-paper font-sans">
        {children}
      </body>
    </html>
  );
}
