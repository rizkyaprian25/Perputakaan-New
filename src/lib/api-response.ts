/**
 * Perpustakaan NETRI - Helper Standar Format Respons API
 * Mengikuti format ApiResponse<T> di contracts/skema.ts
 */

import { NextResponse } from "next/server";
import { ApiResponse } from "@/contracts/skema";

export function responSukses<T>(data: T, pesan: string = "Operasi berhasil", status: number = 200) {
  const body: ApiResponse<T> = {
    sukses: true,
    data,
    pesan,
    kodeStatus: status,
  };
  return NextResponse.json(body, { status });
}

export function responGalat(
  pesan: string,
  status: number = 400,
  errorId?: string,
  data: unknown = null
) {
  const body: ApiResponse = {
    sukses: false,
    data,
    pesan,
    kodeStatus: status,
    errorId,
  };
  return NextResponse.json(body, { status });
}
