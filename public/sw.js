/**
 * Perpustakaan NETRI — Service Worker Resmi (PWA)
 * Mengisolasi cache dari aplikasi lain di localhost (membersihkan cache non-netri),
 * mendukung strategi Network-First untuk halaman & Stale-While-Revalidate untuk aset statis,
 * serta meneruskan sinyal sinkronisasi lintas tab.
 */

const CACHE_PREFIX = "perpustakaan-netri-";
const CACHE_VERSION = "v2.2.0";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
];

// 1. Install: Simpan aset inti Perpustakaan NETRI & aktifkan segera
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Abaikan jika ada rute dinamis yang gagal di-precache saat instalasi awal
      });
    })
  );
});

// 2. Activate: Bersihkan seluruh cache milik aplikasi lain (mis. mystrava) atau versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve(false);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. Fetch: Jangan pernah cache endpoint mutasi/API & halaman cetak fisik
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Jangan intersep API, rute cetak fisik, atau internal hot-reload Next.js
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/cetak-") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // Strategi untuk Aset Statis Gambar/Ikon saja (JANGAN cache bundle JS Next.js agar pembaruan kode langsung aktif):
  if (
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webp")
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkPromise;
      })
    );
    return;
  }

  // Strategi untuk Navigasi Halaman (Katalog, Kiosk, Admin): Network-First dengan Fallback Cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedPage = await cache.match(request);
          if (cachedPage) return cachedPage;
          const fallbackRoot = await cache.match("/");
          return fallbackRoot || Response.error();
        })
    );
  }
});

// 4. Sinkronisasi Pesan Antar Klien PWA (Broadcast dari Sirkulasi / Kiosk / Admin)
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  // Teruskan sinyal perubahan data ke seluruh jendela PWA yang sedang terbuka
  if (event.data.type === "NETRI_SYNC_EVENT") {
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (event.source && client.id === event.source.id) continue;
        client.postMessage(event.data);
      }
    });
  }
});
