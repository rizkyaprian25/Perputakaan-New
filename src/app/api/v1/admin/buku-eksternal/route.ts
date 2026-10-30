/**
 * Bilik Baca - API Pencarian Buku Eksternal (Server-Side Proxy)
 * Mengambil metadata dari Google Books API dengan cadangan otomatis ke Open Library.
 * Standar Keamanan: Allowlist Host, anti SSRF, sanitasi HTML pada sinopsis (anti-XSS).
 */

import { NextRequest } from "next/server";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Helper pembersih tag HTML dari sinopsis buku eksternal
function bersihkanHtml(teks: string): string {
  return teks.replace(/<[^>]*>?/gm, "").trim();
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

  const hasilBuku: Array<{
    idEksternal: string;
    judul: string;
    penulis: string;
    penerbit: string;
    tahunTerbit: number | null;
    isbn: string | null;
    sinopsis: string;
    sampulUrl: string | null;
    sumber: "google_books" | "open_library";
  }> = [];

  // 1. Coba Sumber Utama: Google Books API
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY || "";
    const urlGoogle = new URL("https://www.googleapis.com/books/v1/volumes");
    urlGoogle.searchParams.set("q", q);
    urlGoogle.searchParams.set("maxResults", "10");
    urlGoogle.searchParams.set("printType", "books");
    if (apiKey) urlGoogle.searchParams.set("key", apiKey);

    const resGoogle = await fetch(urlGoogle.toString(), {
      signal: AbortSignal.timeout(5000),
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
    console.warn("Pencarian Google Books gagal atau timeout, beralih ke Open Library:", errorGoogle);
  }

  // 2. Cadangan Otomatis: Open Library API (jika Google Books kosong / gagal)
  if (hasilBuku.length === 0) {
    try {
      const urlOl = new URL("https://openlibrary.org/search.json");
      urlOl.searchParams.set("q", q);
      urlOl.searchParams.set("limit", "10");
      urlOl.searchParams.set("fields", "key,title,author_name,publisher,first_publish_year,isbn,cover_i");

      const userAgent = process.env.OPENLIBRARY_USER_AGENT || "BilikBaca (kontak@sekolah.sch.id)";
      const resOl = await fetch(urlOl.toString(), {
        signal: AbortSignal.timeout(5000),
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
      console.warn("Pencarian Open Library juga gagal:", errorOl);
    }
  }

  return responSukses(hasilBuku, `Ditemukan ${hasilBuku.length} judul buku dari sumber resmi.`);
}
