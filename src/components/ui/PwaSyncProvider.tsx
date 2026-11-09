"use client";

/**
 * Perpustakaan NETRI — Manajer Sinkronisasi & Siklus Hidup PWA
 * 1. Mengisolasi & membersihkan Service Worker / Cache asing (mis. aplikasi lain di localhost),
 *    lalu mendaftarkan Service Worker resmi Perpustakaan NETRI (/sw.js).
 * 2. Menyediakan kanal sinkronisasi real-time lintas jendela/tab (BroadcastChannel + ServiceWorker message)
 *    agar perubahan pada Sirkulasi, Kiosk Presensi, Katalog Buku, dan Anggota langsung menyegarkan
 *    tampilan di seluruh tab/jendela PWA yang sedang terbuka.
 * 3. Memantau status jaringan (Online / Offline) dan menangani pembaruan Service Worker otomatis.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff, RefreshCw } from "lucide-react";

export type TopikSinkronisasiNetri =
  | "sirkulasi"
  | "presensi"
  | "buku"
  | "anggota"
  | "pengaturan";

export interface PesanSinkronisasiNetri {
  type: "NETRI_SYNC_EVENT";
  topik: TopikSinkronisasiNetri;
  waktu: number;
  keterangan?: string;
}

const CHANNEL_NAME = "perpustakaan_netri_pwa_sync_v2";

/**
 * Fungsi helper global untuk menyiarkan perubahan data ke seluruh jendela/tab PWA Perpustakaan NETRI
 */
export function siarkanSinkronisasiPwa(
  topik: TopikSinkronisasiNetri,
  keterangan?: string
): void {
  if (typeof window === "undefined") return;

  const payload: PesanSinkronisasiNetri = {
    type: "NETRI_SYNC_EVENT",
    topik,
    waktu: Date.now(),
    keterangan,
  };

  // 1. Siarkan via BroadcastChannel API modern
  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    // Abaikan jika browser membatasi BroadcastChannel
  }

  // 2. Siarkan via Service Worker aktif agar jendela standalone PWA juga menerima
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(payload);
    }
  } catch {
    // Abaikan jika SW belum siap
  }

  // 3. Picu event lokal di jendela yang sama
  try {
    window.dispatchEvent(new CustomEvent("netri:pwa-sync", { detail: payload }));
  } catch {
    // Abaikan
  }
}

export function PwaSyncProvider() {
  const router = useRouter();
  const [sedangOffline, setSedangOffline] = useState(false);
  const [notifSinkron, setNotifSinkron] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Pantau status koneksi jaringan
    setSedangOffline(!navigator.onLine);
    const handleOnline = () => {
      setSedangOffline(false);
      router.refresh();
    };
    const handleOffline = () => setSedangOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 2. Bersihkan Service Worker & Cache dari aplikasi lain (non-Perpustakaan NETRI),
    //    kemudian daftarkan Service Worker resmi /sw.js milik Perpustakaan NETRI.
    const kelolaServiceWorker = async () => {
      try {
        if ("caches" in window) {
          const cacheKeys = await caches.keys();
          for (const key of cacheKeys) {
            if (key !== "perpustakaan-netri-v2.2.0") {
              await caches.delete(key);
            }
          }
        }

        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            const scriptUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
            // Jika ada SW dari aplikasi lain (bukan /sw.js milik kita), hapus pendaftarannya
            if (scriptUrl && !scriptUrl.endsWith("/sw.js")) {
              await reg.unregister();
            }
          }

          // Daftarkan Service Worker resmi Perpustakaan NETRI
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          });

          // Jika ada versi SW baru yang menunggu, langsung aktifkan
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
        }
      } catch (err) {
        console.warn("Pendaftaran Service Worker PWA Perpustakaan NETRI dilewati:", err);
      }
    };

    kelolaServiceWorker();

    // 3. Dengarkan sinyal sinkronisasi lintas tab/jendela PWA (BroadcastChannel & ServiceWorker)
    const tanganiSinyalSinkron = (data: PesanSinkronisasiNetri) => {
      if (!data || data.type !== "NETRI_SYNC_EVENT") return;

      // Segarkan Server Components Next.js secara mulus tanpa menghilangkan state form
      router.refresh();

      // Teruskan ke komponen client yang mendengarkan event 'netri:data-mutated'
      window.dispatchEvent(new CustomEvent("netri:data-mutated", { detail: data }));

      if (data.keterangan) {
        setNotifSinkron(data.keterangan);
        setTimeout(() => setNotifSinkron(null), 2800);
      }
    };

    let bc: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (event) => tanganiSinyalSinkron(event.data);
    }

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "NETRI_SYNC_EVENT") {
        tanganiSinyalSinkron(event.data);
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (bc) bc.close();
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      }
    };
  }, [router]);

  // Jangan tampilkan banner apapun saat mencetak dokumen fisik
  if (!sedangOffline && !notifSinkron) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 print:hidden pointer-events-none">
      {sedangOffline && (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-danger text-white text-xs font-mono font-semibold shadow-lg animate-slide-up">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Mode Luring (Offline) • Menampilkan Cache Lokal PWA</span>
        </div>
      )}

      {notifSinkron && (
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-ink text-paper text-xs font-mono shadow-lg border border-white/15 animate-slide-up">
          <RefreshCw className="w-3.5 h-3.5 text-status-tersedia animate-spin shrink-0" />
          <span>Sinkron PWA: {notifSinkron}</span>
        </div>
      )}
    </div>
  );
}
