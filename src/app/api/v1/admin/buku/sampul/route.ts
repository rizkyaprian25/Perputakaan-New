/**
 * Perpustakaan NETRI - API Unggah & Kompresi Sampul Buku Otomatis ke WebP
 * Menerima berkas gambar manual (multipart/form-data) maupun URL eksternal (JSON),
 * lalu mengubah ukuran ke rasio buku 2:3 (480x720 px) dan mengompresinya ke format .webp ringan (~15-35 KB).
 */

import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { ulid } from "ulid";
import { verifikasiAkses } from "@/lib/auth";
import { responSukses, responGalat } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const BATAS_MAKS_UNGGAH_BYTES = 10 * 1024 * 1024; // Maksimal 10 MB sebelum dikompresi
const TIPE_MIME_DIIZINKAN = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);

// Pastikan direktori penyimpanan sampul lokal tersedia
async function pastikanDirektoriSampul(): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", "sampul");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

// Proses buffer gambar mentah menjadi berkas .webp proporsional 2:3 yang sangat ringan
async function kompresDanSimpanWebp(inputBuffer: Buffer): Promise<{
  sampulUrl: string;
  namaBerkas: string;
  ukuranAsliBytes: number;
  ukuranWebpBytes: number;
  hematPersen: number;
}> {
  const ukuranAsliBytes = inputBuffer.byteLength;
  const dirSampul = await pastikanDirektoriSampul();
  const namaBerkas = `sampul-${ulid().toLowerCase()}.webp`;
  const pathLengkap = path.join(dirSampul, namaBerkas);

  // Gunakan sharp: perbaiki orientasi EXIF kamera, potong proporsional 2:3 (480x720), kompres ke WebP
  const webpBuffer = await sharp(inputBuffer)
    .rotate()
    .resize(480, 720, {
      fit: "cover",
      position: "center",
    })
    .webp({
      quality: 80,
      effort: 4,
    })
    .toBuffer();

  await fs.writeFile(pathLengkap, webpBuffer);

  const ukuranWebpBytes = webpBuffer.byteLength;
  const hematPersen =
    ukuranAsliBytes > 0
      ? Math.max(0, Math.round(((ukuranAsliBytes - ukuranWebpBytes) / ukuranAsliBytes) * 100))
      : 0;

  return {
    sampulUrl: `/uploads/sampul/${namaBerkas}`,
    namaBerkas,
    ukuranAsliBytes,
    ukuranWebpBytes,
    hematPersen,
  };
}

export async function POST(req: NextRequest) {
  const auth = await verifikasiAkses(["admin", "petugas"]);
  if (!auth.diizinkan || !auth.user) {
    return responGalat(auth.pesan || "Akses ditolak", auth.status || 401);
  }

  const contentType = req.headers.get("content-type") || "";

  try {
    // CABANG 1: Unggah Berkas Gambar Manual (Drag & Drop / Pilih File dari Komputer/HP)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        return responGalat("Berkas gambar sampul tidak ditemukan dalam permintaan.", 400);
      }

      if (!TIPE_MIME_DIIZINKAN.has(file.type.toLowerCase())) {
        return responGalat(
          "Format gambar tidak didukung. Gunakan file JPG, PNG, WebP, atau AVIF.",
          400
        );
      }

      if (file.size > BATAS_MAKS_UNGGAH_BYTES) {
        return responGalat(
          "Ukuran gambar asli terlalu besar (maksimal 10 MB sebelum dikompresi).",
          400
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const hasil = await kompresDanSimpanWebp(buffer);

      return responSukses(
        hasil,
        `Sampul berhasil diunggah & dikompresi ke WebP (${(hasil.ukuranWebpBytes / 1024).toFixed(1)} KB).`
      );
    }

    // CABANG 2: Kompresi Otomatis dari URL Eksternal (Impor SIBI / Google Books / Open Library)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const remoteUrl = String(body?.remoteUrl || "").trim();

      if (!remoteUrl || (!remoteUrl.startsWith("http://") && !remoteUrl.startsWith("https://"))) {
        return responGalat("URL gambar eksternal tidak valid.", 400);
      }

      const resGambar = await fetch(remoteUrl, {
        signal: AbortSignal.timeout(8000),
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent": "Perpustakaan-NETRI/2.0",
        },
      });

      if (!resGambar.ok) {
        return responGalat("Gagal mengunduh gambar sampul dari sumber eksternal.", 422);
      }

      const arrayBuffer = await resGambar.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.byteLength === 0 || buffer.byteLength > BATAS_MAKS_UNGGAH_BYTES) {
        return responGalat("Ukuran gambar eksternal tidak valid.", 422);
      }

      const hasil = await kompresDanSimpanWebp(buffer);

      return responSukses(
        hasil,
        `Sampul eksternal berhasil diunduh & dikompresi ke WebP (${(hasil.ukuranWebpBytes / 1024).toFixed(1)} KB).`
      );
    }

    return responGalat("Format permintaan unggah sampul tidak dikenali.", 400);
  } catch (error) {
    console.error("Gagal memproses kompresi sampul WebP:", error);
    return responGalat(
      "Gagal memproses gambar sampul. Pastikan berkas yang dipilih adalah file gambar yang valid.",
      500
    );
  }
}
