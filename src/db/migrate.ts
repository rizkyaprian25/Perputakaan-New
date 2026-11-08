/**
 * Perpustakaan NETRI - Skrip Migrasi Otomatis Drizzle
 * Menjalankan migrasi versi bertahap dari folder ./drizzle
 */

import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, pool } from "./index";

async function runMigration() {
  console.log("🚀 Menjalankan migrasi skema database Perpustakaan NETRI...");
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Migrasi skema database berhasil dieksekusi 100%!");
  } catch (error) {
    console.error("❌ Gagal mengeksekusi migrasi skema:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
