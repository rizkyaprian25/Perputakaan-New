/**
 * Perpustakaan NETRI - API Pencarian Buku Eksternal (Multi-Source Server-Side Proxy)
 * Sumber Data Resmi Terintegrasi:
 * 1. SIBI Kemendikbudristek (Katalog Buku Teks Pelajaran Kurikulum Merdeka & K13 Resmi)
 * 2. Buku Indonesia Open API (Katalog Buku Indonesia Berbasis ISBN)
 * 3. Google Books API (Buku Umum & Sastra Nasional / Internasional)
 * 4. Open Library API (Cadangan Arsip Internasional)
 *
 * Standar Keamanan: Server-side proxy, timeout per request, sanitasi HTML XSS, dan deduplikasi.
 */

import { NextRequest } from "next/server";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Helper pembersih tag HTML dari sinopsis buku eksternal
function bersihkanHtml(teks: string): string {
  return teks.replace(/<[^>]*>?/gm, "").trim();
}

interface ItemBukuEksternal {
  idEksternal: string;
  judul: string;
  penulis: string;
  penerbit: string;
  tahunTerbit: number | null;
  isbn: string | null;
  sinopsis: string;
  sampulUrl: string | null;
  sumber: "kemendikbud_sibi" | "buku_indonesia" | "google_books" | "open_library";
}

export async function GET(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get("q") || "").trim();

  if (!q) {
    return responGalat("Kata kunci pencarian tidak boleh kosong", 400);
  }

  const hasilBuku: ItemBukuEksternal[] = [];
  const isbnSet = new Set<string>();

  const normalisasiIsbn = (str: string | null) => (str ? str.replace(/[-\s]/g, "") : "");

  // ---------------------------------------------------------------------------
  // 1. SUMBER UTAMA BUKU PELAJARAN: SIBI Kemendikbudristek (Kurikulum Merdeka)
  // ---------------------------------------------------------------------------
  try {
    const urlSibiPenggerak = new URL("https://api.buku.cloudapp.web.id/api/catalogue/getPenggerakTextBooks");
    urlSibiPenggerak.searchParams.set("title", q);
    urlSibiPenggerak.searchParams.set("limit", "10");

    const resSibi = await fetch(urlSibiPenggerak.toString(), {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
    });

    if (resSibi.ok) {
      const dataSibi = await resSibi.json();
      if (Array.isArray(dataSibi.results)) {
        for (const item of dataSibi.results) {
          const rawIsbn = item.isbn || null;
          const cleanIsbn = normalisasiIsbn(rawIsbn);
          if (cleanIsbn) isbnSet.add(cleanIsbn);

          let tahun = null;
          if (item.published_year) {
            const match = String(item.published_year).match(/\d{4}/);
            if (match) tahun = parseInt(match[0], 10);
          }

          hasilBuku.push({
            idEksternal: `sibi-${item.id}`,
            judul: item.title || "Buku Pelajaran Kemendikbud",
            penulis: item.writer || "Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
            penerbit: item.publisher || "Pusat Perbukuan Kemendikbudristek",
            tahunTerbit: tahun,
            isbn: rawIsbn,
            sinopsis: item.description
              ? bersihkanHtml(item.description)
              : `Buku Teks Pelajaran Resmi Kurikulum Merdeka. Jenjang: ${item.level || "Sekolah"} Kelas ${item.class || "-"}.`,
            sampulUrl: item.image || null,
            sumber: "kemendikbud_sibi",
          });
        }
      }
    }

    // Jika hasil buku penggerak sedikit, cari juga di katalog buku teks kurikulum umum SIBI
    if (hasilBuku.length < 5) {
      const urlSibiTeks = new URL("https://api.buku.cloudapp.web.id/api/catalogue/getTextBooks");
      urlSibiTeks.searchParams.set("title", q);
      urlSibiTeks.searchParams.set("limit", "8");

      const resTeks = await fetch(urlSibiTeks.toString(), {
        signal: AbortSignal.timeout(4000),
        headers: { Accept: "application/json" },
      });

      if (resTeks.ok) {
        const dataTeks = await resTeks.json();
        if (Array.isArray(dataTeks.results)) {
          for (const item of dataTeks.results) {
            const rawIsbn = item.isbn || null;
            const cleanIsbn = normalisasiIsbn(rawIsbn);
            if (cleanIsbn && isbnSet.has(cleanIsbn)) continue;
            if (cleanIsbn) isbnSet.add(cleanIsbn);

            let tahun = null;
            if (item.published_year) {
              const match = String(item.published_year).match(/\d{4}/);
              if (match) tahun = parseInt(match[0], 10);
            }

            hasilBuku.push({
              idEksternal: `sibi-teks-${item.id}`,
              judul: item.title || "Buku Pelajaran Sekolah",
              penulis: item.writer || "Pusat Kurikulum dan Perbukuan",
              penerbit: item.publisher || "Kementerian Pendidikan dan Kebudayaan",
              tahunTerbit: tahun,
              isbn: rawIsbn,
              sinopsis: item.description ? bersihkanHtml(item.description) : "Buku teks kurikulum sekolah nasional.",
              sampulUrl: item.image || null,
              sumber: "kemendikbud_sibi",
            });
          }
        }
      }
    }
  } catch (errSibi) {
    console.warn("Pencarian SIBI Kemendikbud tidak merespon:", errSibi);
  }

  // ---------------------------------------------------------------------------
  // 2. SUMBER KHUSUS ISBN INDONESIA: Buku Indonesia Open API
  // ---------------------------------------------------------------------------
  const qClean = q.replace(/[-\s]/g, "");
  const isQueryIsbn = /^\d{10}(\d{3})?$/.test(qClean);

  if (isQueryIsbn && !isbnSet.has(qClean)) {
    try {
      const urlBukuId = `https://khrlanamm.github.io/buku-indonesia/api/v1/isbn/${qClean}.json`;
      const resBukuId = await fetch(urlBukuId, {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: "application/json" },
      });

      if (resBukuId.ok) {
        const dataId = await resBukuId.json();
        if (dataId && dataId.title) {
          isbnSet.add(qClean);
          hasilBuku.unshift({
            idEksternal: dataId.id || `bukuid-${qClean}`,
            judul: dataId.title,
            penulis: Array.isArray(dataId.authors) ? dataId.authors.join(", ") : "Penulis Anonim",
            penerbit: dataId.publisher || "Penerbit Indonesia",
            tahunTerbit: dataId.year || null,
            isbn: dataId.isbn13 || dataId.isbn10 || qClean,
            sinopsis: dataId.subtitle || "Data terverifikasi dari Katalog Buku Indonesia.",
            sampulUrl: dataId.coverUrl || null,
            sumber: "buku_indonesia",
          });
        }
      }
    } catch (errBukuId) {
      console.warn("Pencarian Buku Indonesia API dilewati:", errBukuId);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. SUMBER UMUM: Google Books API (Buku Nasional & Fiksi/Nonfiksi Umum)
  // ---------------------------------------------------------------------------
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY || "";
    const urlGoogle = new URL("https://www.googleapis.com/books/v1/volumes");
    urlGoogle.searchParams.set("q", q);
    urlGoogle.searchParams.set("maxResults", "8");
    urlGoogle.searchParams.set("printType", "books");
    if (apiKey) urlGoogle.searchParams.set("key", apiKey);

    const resGoogle = await fetch(urlGoogle.toString(), {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
    });

    if (resGoogle.ok) {
      const dataGoogle = await resGoogle.json();
      if (Array.isArray(dataGoogle.items)) {
        for (const item of dataGoogle.items) {
          const info = item.volumeInfo || {};
          let isbn = null;
          if (Array.isArray(info.industryIdentifiers)) {
            const isbn13 = info.industryIdentifiers.find((i: any) => i.type === "ISBN_13");
            const isbn10 = info.industryIdentifiers.find((i: any) => i.type === "ISBN_10");
            isbn = isbn13?.identifier || isbn10?.identifier || null;
          }

          const cleanIsbn = normalisasiIsbn(isbn);
          if (cleanIsbn && isbnSet.has(cleanIsbn)) continue;
          if (cleanIsbn) isbnSet.add(cleanIsbn);

          let tahun = null;
          if (info.publishedDate) {
            const match = info.publishedDate.match(/\d{4}/);
            if (match) tahun = parseInt(match[0], 10);
          }

          const sampul = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
          const sampulAman = sampul ? sampul.replace(/^http:\/\//i, "https://") : null;

          hasilBuku.push({
            idEksternal: item.id,
            judul: info.title || "Tanpa Judul",
            penulis: Array.isArray(info.authors) ? info.authors.join(", ") : "Penulis Anonim",
            penerbit: info.publisher || "Penerbit Tidak Diketahui",
            tahunTerbit: tahun,
            isbn,
            sinopsis: bersihkanHtml(info.description || ""),
            sampulUrl: sampulAman,
            sumber: "google_books",
          });
        }
      }
    }
  } catch (errorGoogle) {
    console.warn("Google Books dilewati atau rate-limited:", errorGoogle);
  }

  // ---------------------------------------------------------------------------
  // 4. CADANGAN TERAKHIR: Open Library API (jika hasil masih kosong)
  // ---------------------------------------------------------------------------
  if (hasilBuku.length === 0) {
    try {
      const urlOl = new URL("https://openlibrary.org/search.json");
      urlOl.searchParams.set("q", q);
      urlOl.searchParams.set("limit", "8");
      urlOl.searchParams.set("fields", "key,title,author_name,publisher,first_publish_year,isbn,cover_i");

      const userAgent = process.env.OPENLIBRARY_USER_AGENT || "BilikBaca (kontak@sekolah.sch.id)";
      const resOl = await fetch(urlOl.toString(), {
        signal: AbortSignal.timeout(4000),
        headers: {
          Accept: "application/json",
          "User-Agent": userAgent,
        },
      });

      if (resOl.ok) {
        const dataOl = await resOl.json();
        if (Array.isArray(dataOl.docs)) {
          for (const doc of dataOl.docs) {
            const isbn = Array.isArray(doc.isbn) ? doc.isbn[0] : null;
            const sampul = doc.cover_i
              ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
              : null;

            hasilBuku.push({
              idEksternal: doc.key || String(Math.random()),
              judul: doc.title || "Tanpa Judul",
              penulis: Array.isArray(doc.author_name) ? doc.author_name.join(", ") : "Penulis Anonim",
              penerbit: Array.isArray(doc.publisher) ? doc.publisher[0] : "Penerbit Tidak Diketahui",
              tahunTerbit: doc.first_publish_year || null,
              isbn,
              sinopsis: "",
              sampulUrl: sampul,
              sumber: "open_library",
            });
          }
        }
      }
    } catch (errorOl) {
      console.warn("Pencarian Open Library dilewati:", errorOl);
    }
  }

  return responSukses(
    hasilBuku,
    `Ditemukan ${hasilBuku.length} judul buku dari sumber Kemendikbud SIBI, Buku Indonesia, dan katalog resmi.`
  );
}
