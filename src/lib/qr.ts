/**
 * Perpustakaan NETRI - Helper Pembangkitan Kode QR (SVG & DataURL)
 * Menghasilkan representasi visual untuk dicetak pada kartu anggota dan label eksemplar buku.
 */

import QRCode from "qrcode";
import { AWALAN_QR } from "@/contracts/konstanta";

// Hasilkan SVG string langsung dari payload string
export async function buatQrSvg(teks: string): Promise<string> {
  return await QRCode.toString(teks, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#1C1A17",
      light: "#FFFFFF",
    },
  });
}

// Hasilkan Data URL base64 untuk tag <img>
export async function buatQrDataUrl(teks: string): Promise<string> {
  return await QRCode.toDataURL(teks, {
    margin: 1,
    width: 256,
    color: {
      dark: "#1C1A17",
      light: "#FFFFFF",
    },
  });
}

// Helper format payload QR
export function buatPayloadQrAnggota(token: string): string {
  return `${AWALAN_QR.ANGGOTA}${token}`;
}

export function buatPayloadQrBuku(kodeEksemplar: string): string {
  return `${AWALAN_QR.BUKU}${kodeEksemplar}`;
}
