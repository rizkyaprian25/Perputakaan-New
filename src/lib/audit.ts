/**
 * Bilik Baca - Helper Pencatatan Log Audit (Append-Only)
 * Standar Keamanan 2: Mencatat setiap aksi penting sistem tanpa menyimpan PII sensitif.
 */

import { db } from "@/db";
import { logAudit } from "@/db/schema";

interface LogAuditParams {
  aktorId?: string | null;
  ipAnonim?: string | null;
  aksi: string;
  objekTipe?: string;
  objekId?: string;
  hasil: "sukses" | "gagal";
  meta?: Record<string, unknown>;
}

export async function tulisLogAudit(params: LogAuditParams) {
  try {
    await db.insert(logAudit).values({
      aktorId: params.aktorId || null,
      ipAnonim: params.ipAnonim || "127.0.0.1",
      aksi: params.aksi,
      objekTipe: params.objekTipe || null,
      objekId: params.objekId || null,
      hasil: params.hasil,
      meta: params.meta || null,
    });
  } catch (error) {
    // Log audit tidak boleh melempar unhandled error yang merusak alur utama,
    // namun harus dicatat di stderr server.
    console.error("Gagal menulis log audit:", error);
  }
}
