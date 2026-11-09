/**
 * Perpustakaan NETRI - API Pencarian Buku Eksternal (Multi-Source Server-Side Proxy)
 * Sumber Data Resmi Terintegrasi:
 * 1. SIBI Kemendikbudristek (Katalog Buku Teks Pelajaran Kurikulum Merdeka & K13 Resmi)
 * 2. Buku Indonesia Open API (Katalog Buku Indonesia Berbasis ISBN)
 * 3. Google Books API (Buku Umum & Sastra Nasional / Internasional)
 * 4. Open Library API (Cadangan Arsip Internasional)
 *
 * Standar Keamanan & Otomasi:
 * - Server-side proxy, timeout per request, sanitasi HTML XSS, deduplikasi.
 * - Otomasi penuh Kategori Cerdas (Smart Category Matcher) berbasis taksonomi DB Perpustakaan NETRI.
 * - Otomasi Jumlah Halaman, Sinopsis Lengkap, dan Saran Lokasi Rak Fisik.
 */

import { NextRequest } from "next/server";
import { pool } from "@/db";
import { responSukses, responGalat } from "@/lib/api-response";
import { verifikasiAkses } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Helper pembersih tag HTML dari sinopsis buku eksternal
function bersihkanHtml(teks: string): string {
  return (teks || "").replace(/<[^>]*>?/gm, "").trim();
}

interface KategoriDBItem {
  id: string;
  kelompok: "hiburan" | "pelajaran";
  nama: string;
  slug: string;
}

interface ItemBukuEksternal {
  idEksternal: string;
  judul: string;
  penulis: string;
  penerbit: string;
  tahunTerbit: number | null;
  isbn: string | null;
  jumlahHalaman: number;
  sinopsis: string;
  sampulUrl: string | null;
  sumber: "kemendikbud_sibi" | "buku_indonesia" | "google_books" | "open_library";
  kategoriOtomatis: {
    id: string;
    nama: string;
    kelompok: "hiburan" | "pelajaran";
  };
  lokasiRakSaran: string;
}

// Algoritma Pencocokan Kategori Cerdas (Smart Category Matcher)
function petakanKategoriOtomatis(
  judul: string,
  categories: string[] = [],
  subjects: string[] = [],
  sumber: string = "",
  daftarKategoriDB: KategoriDBItem[]
): {
  id: string;
  nama: string;
  kelompok: "hiburan" | "pelajaran";
  lokasiRakSaran: string;
} {
  const teksGabung = `${judul} ${categories.join(" ")} ${subjects.join(" ")}`.toLowerCase();

  const cariKategori = (slugTarget: string) => {
    return daftarKategoriDB.find((k) => k.slug === slugTarget);
  };

  const cariNama = (kataKunci: string) => {
    return daftarKategoriDB.find((k) => k.nama.toLowerCase().includes(kataKunci.toLowerCase()));
  };

  // A. DIRECT MATCHING: Jika kategori/subjek dari API cocok persis dengan salah satu kategori di DB
  for (const catName of [...categories, ...subjects]) {
    const cleanCat = (catName || "").trim().toLowerCase();
    if (!cleanCat || cleanCat.length < 3) continue;

    const foundDirect = daftarKategoriDB.find(
      (k) =>
        k.nama.toLowerCase() === cleanCat ||
        k.slug === cleanCat.replace(/[^a-z0-9]+/g, "-") ||
        k.nama.toLowerCase().includes(cleanCat) ||
        cleanCat.includes(k.nama.toLowerCase())
    );

    if (foundDirect) {
      let rak = foundDirect.kelompok === "pelajaran" ? "P-01" : "R-01";
      if (foundDirect.slug === "filsafat") rak = "F-01";
      else if (foundDirect.slug === "pengembangan-diri") rak = "PD-01";
      else if (foundDirect.slug === "psikologi") rak = "PS-01";
      else if (foundDirect.slug === "bisnis-finansial") rak = "B-02";
      else if (foundDirect.slug === "sejarah-budaya") rak = "SJ-01";
      else if (foundDirect.slug === "teknologi-digital") rak = "TK-01";
      else if (foundDirect.slug === "komik") rak = "K-01";
      else if (foundDirect.slug === "biografi") rak = "B-01";
      return { id: foundDirect.id, nama: foundDirect.nama, kelompok: foundDirect.kelompok, lokasiRakSaran: rak };
    }
  }

  // B. PENCARIAN CERDAS BERBASIS KATA KUNCI (KEYWORD TAXONOMY MATCHER)

  // 1. FILSAFAT & MAKNA HIDUP (Contoh: Filosofi Teras, Stoikisme, Makna Hidup)
  if (
    teksGabung.includes("filosofi") ||
    teksGabung.includes("filsafat") ||
    teksGabung.includes("philosophy") ||
    teksGabung.includes("stoik") ||
    teksGabung.includes("stoicism") ||
    teksGabung.includes("makna hidup") ||
    teksGabung.includes("kebijaksanaan") ||
    teksGabung.includes("etika hidup") ||
    teksGabung.includes("eksistensialisme") ||
    teksGabung.includes("seneca") ||
    teksGabung.includes("epictetus") ||
    teksGabung.includes("marcus aurelius")
  ) {
    const k = cariKategori("filsafat") || cariNama("filsafat") || cariKategori("pengembangan-diri");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "F-01" };
  }

  // 2. PENGEMBANGAN DIRI / SELF-IMPROVEMENT (Contoh: Atomic Habits, Mindset, Motivasi)
  if (
    teksGabung.includes("pengembangan diri") ||
    teksGabung.includes("self improvement") ||
    teksGabung.includes("self-improvement") ||
    teksGabung.includes("self help") ||
    teksGabung.includes("self-help") ||
    teksGabung.includes("kebiasaan") ||
    teksGabung.includes("habits") ||
    teksGabung.includes("mindset") ||
    teksGabung.includes("produktivitas") ||
    teksGabung.includes("productivity") ||
    teksGabung.includes("motivasi") ||
    teksGabung.includes("bodo amat") ||
    teksGabung.includes("sukses") ||
    teksGabung.includes("manajemen waktu")
  ) {
    const k = cariKategori("pengembangan-diri") || cariNama("pengembangan diri");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "PD-01" };
  }

  // 3. PSIKOLOGI (Contoh: Bicara Itu Ada Seninya, Mental Health, Emosi)
  if (
    teksGabung.includes("psikologi") ||
    teksGabung.includes("psychology") ||
    teksGabung.includes("mental health") ||
    teksGabung.includes("kesehatan mental") ||
    teksGabung.includes("bicara itu ada seninya") ||
    teksGabung.includes("introvert") ||
    teksGabung.includes("ekstrovert") ||
    teksGabung.includes("kepribadian") ||
    teksGabung.includes("emosi") ||
    teksGabung.includes("komunikasi interpersonal") ||
    teksGabung.includes("kecemasan") ||
    teksGabung.includes("trauma")
  ) {
    const k = cariKategori("psikologi") || cariNama("psikologi") || cariKategori("pengembangan-diri");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "PS-01" };
  }

  // 4. BISNIS & FINANSIAL (Contoh: Rich Dad Poor Dad, Investasi, Saham)
  if (
    teksGabung.includes("bisnis") ||
    teksGabung.includes("business") ||
    teksGabung.includes("finansial") ||
    teksGabung.includes("financial") ||
    teksGabung.includes("keuangan") ||
    teksGabung.includes("investasi") ||
    teksGabung.includes("saham") ||
    teksGabung.includes("uang") ||
    teksGabung.includes("money") ||
    teksGabung.includes("rich dad") ||
    teksGabung.includes("marketing") ||
    teksGabung.includes("kewirausahaan") ||
    teksGabung.includes("entrepreneur")
  ) {
    const k = cariKategori("bisnis-finansial") || cariNama("bisnis") || cariKategori("nonfiksi-umum");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "B-02" };
  }

  // 5. SEJARAH & BUDAYA (Contoh: Sapiens, Peradaban, Nusantara)
  if (
    teksGabung.includes("sejarah dunia") ||
    teksGabung.includes("peradaban") ||
    teksGabung.includes("sapiens") ||
    teksGabung.includes("arkeologi") ||
    teksGabung.includes("kebudayaan") ||
    teksGabung.includes("budaya nusantara") ||
    (teksGabung.includes("sejarah") && !sumber.includes("sibi"))
  ) {
    const k = cariKategori("sejarah-budaya") || cariNama("sejarah") || cariKategori("nonfiksi-umum");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "SJ-01" };
  }

  // 6. TEKNOLOGI & DIGITAL (Contoh: Coding, AI, Komputer)
  if (
    teksGabung.includes("teknologi digital") ||
    teksGabung.includes("pemrograman") ||
    teksGabung.includes("programming") ||
    teksGabung.includes("coding") ||
    teksGabung.includes("artificial intelligence") ||
    teksGabung.includes("kecerdasan buatan") ||
    teksGabung.includes("internet of things") ||
    teksGabung.includes("cyber security")
  ) {
    const k = cariKategori("teknologi-digital") || cariNama("teknologi") || cariKategori("sains-populer");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "TK-01" };
  }

  // 7. PENDIDIKAN AGAMA & BUDI PEKERTI / SPIRITUALITAS
  if (
    teksGabung.includes("agama") ||
    teksGabung.includes("budi pekerti") ||
    teksGabung.includes("islam") ||
    teksGabung.includes("kristen") ||
    teksGabung.includes("katolik") ||
    teksGabung.includes("hindu") ||
    teksGabung.includes("buddha") ||
    teksGabung.includes("quran") ||
    teksGabung.includes("hadits") ||
    teksGabung.includes("fiqih") ||
    teksGabung.includes("tasawuf") ||
    teksGabung.includes("akhlak") ||
    teksGabung.includes("renungan hati") ||
    teksGabung.includes("spiritual")
  ) {
    if (sumber === "kemendikbud_sibi" || teksGabung.includes("pelajaran") || teksGabung.includes("kurikulum")) {
      const k = cariKategori("pai") || cariNama("agama");
      if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "P-07" };
    }
    const kReligi = cariKategori("spiritualitas") || cariNama("religi") || cariKategori("pai");
    if (kReligi) return { id: kReligi.id, nama: kReligi.nama, kelompok: kReligi.kelompok, lokasiRakSaran: "SP-01" };
  }

  // 8. MATEMATIKA (Buku Teks / Pelajaran)
  if (
    teksGabung.includes("matematika") ||
    teksGabung.includes("mathematics") ||
    teksGabung.includes("aljabar") ||
    teksGabung.includes("kalkulus") ||
    teksGabung.includes("geometri") ||
    teksGabung.includes("aritmatika") ||
    /\bmath\b/.test(teksGabung)
  ) {
    const k = cariKategori("matematika") || cariNama("matematika");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "P-04" };
  }

  // 9. ILMU PENGETAHUAN ALAM (IPA)
  if (
    teksGabung.includes("ilmu pengetahuan alam") ||
    /\bipa\b/.test(teksGabung) ||
    teksGabung.includes("biologi") ||
    teksGabung.includes("fisika") ||
    teksGabung.includes("kimia") ||
    teksGabung.includes("biology") ||
    teksGabung.includes("physics") ||
    teksGabung.includes("chemistry")
  ) {
    const k = cariKategori("ipa") || cariNama("ipa");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "P-03" };
  }

  // 10. ILMU PENGETAHUAN SOSIAL (IPS)
  if (
    teksGabung.includes("ilmu pengetahuan sosial") ||
    /\bips\b/.test(teksGabung) ||
    teksGabung.includes("geografi") ||
    teksGabung.includes("ekonomi sekolah") ||
    teksGabung.includes("sosiologi") ||
    (sumber === "kemendikbud_sibi" && teksGabung.includes("sejarah"))
  ) {
    const k = cariKategori("ips") || cariNama("ips");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "P-05" };
  }

  // 11. BAHASA INGGRIS
  if (
    teksGabung.includes("bahasa inggris") ||
    teksGabung.includes("english") ||
    teksGabung.includes("grammar") ||
    teksGabung.includes("toefl") ||
    teksGabung.includes("vocabulary")
  ) {
    const k = cariKategori("bahasa-inggris") || cariNama("inggris");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "P-02" };
  }

  // 12. BAHASA INDONESIA
  if (
    teksGabung.includes("bahasa indonesia") ||
    teksGabung.includes("tata bahasa indonesia") ||
    (sumber === "kemendikbud_sibi" && teksGabung.includes("indonesia"))
  ) {
    const k = cariKategori("bahasa-indonesia") || cariNama("indonesia");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "P-01" };
  }

  // 13. PPKN / PANCASILA
  if (
    teksGabung.includes("ppkn") ||
    teksGabung.includes("pancasila") ||
    teksGabung.includes("kewarganegaraan") ||
    teksGabung.includes("civics")
  ) {
    const k = cariKategori("ppkn") || cariNama("ppkn");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "P-06" };
  }

  // 14. KOMIK / MANGA
  if (
    teksGabung.includes("komik") ||
    teksGabung.includes("comic") ||
    teksGabung.includes("manga") ||
    teksGabung.includes("graphic novel") ||
    teksGabung.includes("manhwa")
  ) {
    const k = cariKategori("komik") || cariNama("komik");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "K-01" };
  }

  // 15. BIOGRAFI / AUTOBIOGRAFI
  if (
    teksGabung.includes("biografi") ||
    teksGabung.includes("biography") ||
    teksGabung.includes("autobiography") ||
    teksGabung.includes("memoir") ||
    teksGabung.includes("memoar") ||
    teksGabung.includes("kisah nyata") ||
    teksGabung.includes("perjalanan hidup")
  ) {
    const k = cariKategori("biografi") || cariNama("biografi");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "B-01" };
  }

  // 16. CERPEN & PUISI
  if (
    teksGabung.includes("cerpen") ||
    teksGabung.includes("puisi") ||
    teksGabung.includes("poetry") ||
    teksGabung.includes("poems") ||
    teksGabung.includes("short stories") ||
    teksGabung.includes("sajak") ||
    teksGabung.includes("pantun") ||
    teksGabung.includes("antologi")
  ) {
    const k = cariKategori("cerpen-puisi") || cariNama("cerpen");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "R-02" };
  }

  // 17. SAINS POPULER
  if (
    teksGabung.includes("sains populer") ||
    teksGabung.includes("popular science") ||
    teksGabung.includes("astronomi") ||
    teksGabung.includes("astronomy") ||
    teksGabung.includes("antariksa") ||
    teksGabung.includes("alam semesta") ||
    teksGabung.includes("ensiklopedia")
  ) {
    const k = cariKategori("sains-populer") || cariNama("sains");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "S-01" };
  }

  // 18. NONFIKSI UMUM (Koleksi Bacaan Wawasan & Esai)
  if (
    teksGabung.includes("nonfiksi") ||
    teksGabung.includes("non-fiction") ||
    teksGabung.includes("nonfiction") ||
    teksGabung.includes("esai") ||
    teksGabung.includes("jurnalisme") ||
    teksGabung.includes("panduan")
  ) {
    const k = cariKategori("nonfiksi-umum") || cariNama("nonfiksi");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "NF-01" };
  }

  // 19. JIKA SUMBER SIBI (BUKU PELAJARAN SEKOLAH) TAPI BELUM COCOK
  if (sumber === "kemendikbud_sibi") {
    const k =
      cariKategori("pelajaran-lainnya") ||
      cariNama("lainnya") ||
      daftarKategoriDB.find((x) => x.kelompok === "pelajaran");
    if (k) return { id: k.id, nama: k.nama, kelompok: k.kelompok, lokasiRakSaran: "P-08" };
  }

  // 20. DEFAULT BACAAN HIBURAN / NOVEL (Fiksi, Sastra)
  const katNovel =
    cariKategori("novel") ||
    cariNama("novel") ||
    daftarKategoriDB.find((x) => x.kelompok === "hiburan") ||
    daftarKategoriDB[0];

  return {
    id: katNovel ? katNovel.id : "",
    nama: katNovel ? katNovel.nama : "Novel",
    kelompok: katNovel ? katNovel.kelompok : "hiburan",
    lokasiRakSaran: "R-01",
  };
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

  // Ambil seluruh master kategori dari basis data untuk pencocokan cerdas
  let daftarKategoriDB: KategoriDBItem[] = [];
  try {
    const [kategoriRows]: any = await pool.query(
      "SELECT id, kelompok, nama, slug FROM kategori ORDER BY id ASC"
    );
    daftarKategoriDB = kategoriRows || [];
  } catch (errDB) {
    console.warn("Gagal memuat kategori DB untuk matcher, menggunakan fallback:", errDB);
  }

  const hasilBuku: ItemBukuEksternal[] = [];
  const isbnSet = new Set<string>();

  const normalisasiIsbn = (str: string | null) => (str ? str.replace(/[-\s]/g, "") : "");

  // ---------------------------------------------------------------------------
  // 1. SUMBER UTAMA BUKU PELAJARAN: SIBI Kemendikbudristek (Kurikulum Merdeka)
  // ---------------------------------------------------------------------------
  try {
    const urlSibiPenggerak = new URL(
      "https://api.buku.cloudapp.web.id/api/catalogue/getPenggerakTextBooks"
    );
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

          // Ekstraksi jumlah halaman dari collation SIBI (misal: "xii, 240 hlm.")
          let halaman = 220;
          if (item.collation) {
            const matchCol = String(item.collation).match(/(\d+)\s*hlm/i);
            if (matchCol) halaman = parseInt(matchCol[1], 10);
          }

          const sinopsisMentah = bersihkanHtml(item.description || "");
          const sinopsis =
            sinopsisMentah.length >= 20
              ? sinopsisMentah
              : `Buku Teks Pelajaran Resmi Kurikulum Merdeka untuk jenjang ${
                  item.level || "Sekolah"
                } Kelas ${item.class || "-"}. Diterbitkan resmi oleh ${
                  item.publisher || "Pusat Perbukuan Kemendikbudristek"
                } sebagai pegangan kegiatan belajar mengajar.`;

          const kategoriCocok = petakanKategoriOtomatis(
            item.title || "",
            [item.category || ""],
            [item.subject || "", item.level || "", `Kelas ${item.class || ""}`],
            "kemendikbud_sibi",
            daftarKategoriDB
          );

          hasilBuku.push({
            idEksternal: `sibi-${item.id}`,
            judul: item.title || "Buku Pelajaran Kemendikbud",
            penulis: item.writer || "Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
            penerbit: item.publisher || "Pusat Perbukuan Kemendikbudristek",
            tahunTerbit: tahun,
            isbn: rawIsbn,
            jumlahHalaman: halaman,
            sinopsis,
            sampulUrl: item.image || null,
            sumber: "kemendikbud_sibi",
            kategoriOtomatis: {
              id: kategoriCocok.id,
              nama: kategoriCocok.nama,
              kelompok: kategoriCocok.kelompok,
            },
            lokasiRakSaran: kategoriCocok.lokasiRakSaran,
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

            let halaman = 220;
            if (item.collation) {
              const matchCol = String(item.collation).match(/(\d+)\s*hlm/i);
              if (matchCol) halaman = parseInt(matchCol[1], 10);
            }

            const sinopsisMentah = bersihkanHtml(item.description || "");
            const sinopsis =
              sinopsisMentah.length >= 20
                ? sinopsisMentah
                : `Buku Teks Pelajaran Resmi Kurikulum Nasional untuk jenjang ${
                    item.level || "Sekolah"
                  } Kelas ${item.class || "-"}. Terdaftar resmi dalam katalog kurikulum.`;

            const kategoriCocok = petakanKategoriOtomatis(
              item.title || "",
              [item.category || ""],
              [item.subject || "", item.level || "", `Kelas ${item.class || ""}`],
              "kemendikbud_sibi",
              daftarKategoriDB
            );

            hasilBuku.push({
              idEksternal: `sibi-teks-${item.id}`,
              judul: item.title || "Buku Pelajaran Sekolah",
              penulis: item.writer || "Pusat Kurikulum dan Perbukuan",
              penerbit: item.publisher || "Kementerian Pendidikan dan Kebudayaan",
              tahunTerbit: tahun,
              isbn: rawIsbn,
              jumlahHalaman: halaman,
              sinopsis,
              sampulUrl: item.image || null,
              sumber: "kemendikbud_sibi",
              kategoriOtomatis: {
                id: kategoriCocok.id,
                nama: kategoriCocok.nama,
                kelompok: kategoriCocok.kelompok,
              },
              lokasiRakSaran: kategoriCocok.lokasiRakSaran,
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

          let halaman = 200;
          if (dataId.pages) {
            const h = parseInt(String(dataId.pages).replace(/\D/g, ""), 10);
            if (h && h > 0) halaman = h;
          } else if (dataId.pageCount) {
            halaman = Number(dataId.pageCount) || 200;
          }

          const sinopsisMentah = bersihkanHtml(dataId.subtitle || dataId.description || "");
          const sinopsis =
            sinopsisMentah.length >= 20
              ? sinopsisMentah
              : `Buku karya ${
                  Array.isArray(dataId.authors) ? dataId.authors.join(", ") : "penulis"
                } terbitan ${dataId.publisher || "Penerbit Indonesia"} (${
                  dataId.year || "-"
                }). Terdaftar resmi dalam Katalog Buku Indonesia berbasis ISBN.`;

          const kategoriCocok = petakanKategoriOtomatis(
            dataId.title,
            dataId.categories || [],
            dataId.subjects || [],
            "buku_indonesia",
            daftarKategoriDB
          );

          hasilBuku.unshift({
            idEksternal: dataId.id || `bukuid-${qClean}`,
            judul: dataId.title,
            penulis: Array.isArray(dataId.authors) ? dataId.authors.join(", ") : "Penulis Anonim",
            penerbit: dataId.publisher || "Penerbit Indonesia",
            tahunTerbit: dataId.year || null,
            isbn: dataId.isbn13 || dataId.isbn10 || qClean,
            jumlahHalaman: halaman,
            sinopsis,
            sampulUrl: dataId.coverUrl || null,
            sumber: "buku_indonesia",
            kategoriOtomatis: {
              id: kategoriCocok.id,
              nama: kategoriCocok.nama,
              kelompok: kategoriCocok.kelompok,
            },
            lokasiRakSaran: kategoriCocok.lokasiRakSaran,
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

          const halaman = Number(info.pageCount) || 240;
          const sinopsisMentah = bersihkanHtml(info.description || "");
          const sinopsis =
            sinopsisMentah.length >= 20
              ? sinopsisMentah
              : `Buku karya ${
                  Array.isArray(info.authors) ? info.authors.join(", ") : "penulis"
                } diterbitkan oleh ${info.publisher || "Penerbit"} pada tahun ${
                  tahun || "-"
                }. Koleksi literasi umum yang siap dipinjam di perpustakaan.`;

          const kategoriCocok = petakanKategoriOtomatis(
            info.title || "",
            Array.isArray(info.categories) ? info.categories : [],
            [],
            "google_books",
            daftarKategoriDB
          );

          hasilBuku.push({
            idEksternal: item.id,
            judul: info.title || "Tanpa Judul",
            penulis: Array.isArray(info.authors) ? info.authors.join(", ") : "Penulis Anonim",
            penerbit: info.publisher || "Penerbit Tidak Diketahui",
            tahunTerbit: tahun,
            isbn,
            jumlahHalaman: halaman,
            sinopsis,
            sampulUrl: sampulAman,
            sumber: "google_books",
            kategoriOtomatis: {
              id: kategoriCocok.id,
              nama: kategoriCocok.nama,
              kelompok: kategoriCocok.kelompok,
            },
            lokasiRakSaran: kategoriCocok.lokasiRakSaran,
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
      urlOl.searchParams.set(
        "fields",
        "key,title,author_name,publisher,first_publish_year,isbn,cover_i,number_of_pages_median,subject,first_sentence"
      );

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

            const halaman = Number(doc.number_of_pages_median || doc.number_of_pages) || 200;

            const kalimatAwal = doc.first_sentence
              ? bersihkanHtml(
                  Array.isArray(doc.first_sentence)
                    ? doc.first_sentence[0]
                    : String(doc.first_sentence)
                )
              : "";

            const sinopsis =
              kalimatAwal.length >= 20
                ? kalimatAwal
                : `Koleksi buku karya ${
                    Array.isArray(doc.author_name) ? doc.author_name.join(", ") : "penulis"
                  } terbitan ${
                    Array.isArray(doc.publisher) ? doc.publisher[0] : "Penerbit"
                  } (${doc.first_publish_year || "-"}). Terdaftar dalam arsip katalog perpustakaan internasional.`;

            const kategoriCocok = petakanKategoriOtomatis(
              doc.title || "",
              [],
              Array.isArray(doc.subject) ? doc.subject : [],
              "open_library",
              daftarKategoriDB
            );

            hasilBuku.push({
              idEksternal: doc.key || String(Math.random()),
              judul: doc.title || "Tanpa Judul",
              penulis: Array.isArray(doc.author_name)
                ? doc.author_name.join(", ")
                : "Penulis Anonim",
              penerbit: Array.isArray(doc.publisher)
                ? doc.publisher[0]
                : "Penerbit Tidak Diketahui",
              tahunTerbit: doc.first_publish_year || null,
              isbn,
              jumlahHalaman: halaman,
              sinopsis,
              sampulUrl: sampul,
              sumber: "open_library",
              kategoriOtomatis: {
                id: kategoriCocok.id,
                nama: kategoriCocok.nama,
                kelompok: kategoriCocok.kelompok,
              },
              lokasiRakSaran: kategoriCocok.lokasiRakSaran,
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
