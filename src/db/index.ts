/**
 * Perpustakaan NETRI - Koneksi Basis Data MySQL Drizzle ORM
 * Menggunakan pool koneksi mysql2 dengan prepared statement terparameterisasi (Anti-SQLi).
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// Gunakan koneksi pool tunggal (singleton)
const connectionUri =
  process.env.DATABASE_URL || "mysql://perpus_app:BilikBacaSecret2026!@127.0.0.1:3306/perpus";

export const pool = mysql.createPool({
  uri: connectionUri,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export const db = drizzle(pool, { schema, mode: "default" });
export type Database = typeof db;
