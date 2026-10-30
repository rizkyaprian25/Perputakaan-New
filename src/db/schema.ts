/**
 * Bilik Baca - Skema Database Relasional (Drizzle ORM MySQL)
 * Mengikuti spesifikasi arsitektur PRD.md Seksi 7 dan 10 Standar Keamanan Aplikasi.
 */

import {
  mysqlTable,
  varchar,
  char,
  text,
  int,
  bigint,
  boolean,
  datetime,
  date,
  timestamp,
  mysqlEnum,
  json,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { relations, sql } from "drizzle-orm";
import {
  KELOMPOK_KATEGORI,
  STATUS_EKSEMPLAR,
  JENIS_ANGGOTA,
  STATUS_ANGGOTA,
  PERAN_PENGGUNA,
  METODE_ABSENSI,
  SUMBER_BUKU,
} from "../contracts/konstanta";

// 1. Tabel Pengguna (Admin & Petugas)
export const pengguna = mysqlTable(
  "pengguna",
  {
    id: char("id", { length: 26 }).primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    kataSandiHash: varchar("kata_sandi_hash", { length: 255 }).notNull(),
    peran: mysqlEnum("peran", PERAN_PENGGUNA).notNull().default("petugas"),
    aktif: boolean("aktif").notNull().default(true),
    gagalLogin: int("gagal_login").notNull().default(0),
    terkunciHingga: datetime("terkunci_hingga"),
    totpSecretEnc: text("totp_secret_enc"),
    dibuatPada: timestamp("dibuat_pada").notNull().defaultNow(),
    diperbaruiPada: timestamp("diperbarui_pada").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [uniqueIndex("uq_pengguna_username").on(table.username)]
);

// 2. Tabel Sesi (Server-Side Session Opaque Token)
export const sesi = mysqlTable(
  "sesi",
  {
    tokenHash: char("token_hash", { length: 64 }).primaryKey(), // SHA-256 Hex Hash
    penggunaId: char("pengguna_id", { length: 26 })
      .notNull()
      .references(() => pengguna.id, { onDelete: "cascade" }),
    kedaluwarsaIdle: datetime("kedaluwarsa_idle").notNull(),
    kedaluwarsaAbsolut: datetime("kedaluwarsa_absolut").notNull(),
    ipAnonim: varchar("ip_anonim", { length: 45 }),
    agenRingkas: varchar("agen_ringkas", { length: 255 }),
    dibuatPada: timestamp("dibuat_pada").notNull().defaultNow(),
  },
  (table) => [index("idx_sesi_pengguna_id").on(table.penggunaId)]
);

// 3. Tabel Kategori Buku
export const kategori = mysqlTable(
  "kategori",
  {
    id: char("id", { length: 26 }).primaryKey(),
    kelompok: mysqlEnum("kelompok", KELOMPOK_KATEGORI).notNull(),
    nama: varchar("nama", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    dibuatPada: timestamp("dibuat_pada").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_kategori_kelompok_nama").on(table.kelompok, table.nama),
    uniqueIndex("uq_kategori_slug").on(table.slug),
  ]
);

// 4. Tabel Buku (Judul / Karya)
export const buku = mysqlTable(
  "buku",
  {
    id: char("id", { length: 26 }).primaryKey(),
    isbn: varchar("isbn", { length: 20 }),
    judul: varchar("judul", { length: 300 }).notNull(),
    penulis: varchar("penulis", { length: 300 }).notNull(),
    penerbit: varchar("penerbit", { length: 200 }),
    tahunTerbit: int("tahun_terbit"),
    jumlahHalaman: int("jumlah_halaman"),
    sinopsis: text("sinopsis"),
    sampulBerkas: varchar("sampul_berkas", { length: 255 }),
    kategoriId: char("kategori_id", { length: 26 })
      .notNull()
      .references(() => kategori.id, { onDelete: "restrict" }),
    lokasiRak: varchar("lokasi_rak", { length: 50 }),
    sumber: mysqlEnum("sumber", SUMBER_BUKU).notNull().default("manual"),
    idSumber: varchar("id_sumber", { length: 100 }),
    dihapusPada: datetime("dihapus_pada"), // Soft-delete
    dibuatPada: timestamp("dibuat_pada").notNull().defaultNow(),
    diperbaruiPada: timestamp("diperbarui_pada").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_buku_kategori_id").on(table.kategoriId),
    index("idx_buku_isbn").on(table.isbn),
    index("idx_buku_dihapus_pada").on(table.dihapusPada),
  ]
);

// 5. Tabel Eksemplar Fisik Buku
export const eksemplar = mysqlTable(
  "eksemplar",
  {
    id: char("id", { length: 26 }).primaryKey(),
    bukuId: char("buku_id", { length: 26 })
      .notNull()
      .references(() => buku.id, { onDelete: "cascade" }),
    kode: varchar("kode", { length: 30 }).notNull().unique(), // Contoh: BB-000123
    status: mysqlEnum("status", STATUS_EKSEMPLAR).notNull().default("tersedia"),
    dibuatPada: timestamp("dibuat_pada").notNull().defaultNow(),
    diperbaruiPada: timestamp("diperbarui_pada").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("uq_eksemplar_kode").on(table.kode),
    index("idx_eksemplar_buku_status").on(table.bukuId, table.status),
  ]
);

// 6. Tabel Anggota Perpustakaan
export const anggota = mysqlTable(
  "anggota",
  {
    id: char("id", { length: 26 }).primaryKey(),
    nomorInduk: varchar("nomor_induk", { length: 25 }).notNull().unique(), // NIS atau NIP
    nama: varchar("nama", { length: 150 }).notNull(),
    jenis: mysqlEnum("jenis", JENIS_ANGGOTA).notNull().default("siswa"),
    kelas: varchar("kelas", { length: 50 }),
    qrToken: varchar("qr_token", { length: 32 }).notNull().unique(), // CSPRNG Token
    status: mysqlEnum("status", STATUS_ANGGOTA).notNull().default("aktif"),
    dibuatPada: timestamp("dibuat_pada").notNull().defaultNow(),
    diperbaruiPada: timestamp("diperbarui_pada").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("uq_anggota_nomor_induk").on(table.nomorInduk),
    uniqueIndex("uq_anggota_qr_token").on(table.qrToken),
    index("idx_anggota_status_kelas").on(table.status, table.kelas),
  ]
);

// 7. Tabel Transaksi Peminjaman Sirkulasi
export const peminjaman = mysqlTable(
  "peminjaman",
  {
    id: char("id", { length: 26 }).primaryKey(),
    anggotaId: char("anggota_id", { length: 26 })
      .notNull()
      .references(() => anggota.id, { onDelete: "restrict" }),
    eksemplarId: char("eksemplar_id", { length: 26 })
      .notNull()
      .references(() => eksemplar.id, { onDelete: "restrict" }),
    petugasId: char("petugas_id", { length: 26 })
      .notNull()
      .references(() => pengguna.id, { onDelete: "restrict" }),
    petugasKembaliId: char("petugas_kembali_id", { length: 26 }).references(() => pengguna.id, {
      onDelete: "set null",
    }),
    dipinjamPada: datetime("dipinjam_pada").notNull(),
    jatuhTempo: datetime("jatuh_tempo").notNull(),
    dikembalikanPada: datetime("dikembalikan_pada"),
    perpanjanganKe: int("perpanjangan_ke").notNull().default(0),
    kunciIdempoten: varchar("kunci_idempoten", { length: 64 }).unique(),
    batchId: varchar("batch_id", { length: 36 }),
    dendaRp: int("denda_rp").notNull().default(0),
    // Kolom kunci anti-pinjam-ganda (Hanya terisi saat dikembalikan_pada IS NULL)
    aktifEksemplarId: char("aktif_eksemplar_id", { length: 26 }),
  },
  (table) => [
    index("idx_peminjaman_anggota_kembali").on(table.anggotaId, table.dikembalikanPada),
    index("idx_peminjaman_jatuh_tempo").on(table.jatuhTempo),
    uniqueIndex("uq_eksemplar_aktif").on(table.aktifEksemplarId),
  ]
);

// 8. Tabel Absensi Kunjungan Kiosk
export const kunjungan = mysqlTable(
  "kunjungan",
  {
    id: char("id", { length: 26 }).primaryKey(),
    anggotaId: char("anggota_id", { length: 26 })
      .notNull()
      .references(() => anggota.id, { onDelete: "cascade" }),
    tanggal: date("tanggal").notNull(), // Format YYYY-MM-DD (WIB)
    waktu: datetime("waktu").notNull(),
    metode: mysqlEnum("metode", METODE_ABSENSI).notNull().default("qr"),
    kioskLabel: varchar("kiosk_label", { length: 50 }),
  },
  (table) => [
    // Menjamin satu siswa hanya tercatat 1 kali kunjungan per hari (Idempoten harian)
    uniqueIndex("uq_kunjungan_harian").on(table.anggotaId, table.tanggal),
    index("idx_kunjungan_tanggal").on(table.tanggal),
  ]
);

// 9. Tabel Log Audit (Append-Only)
export const logAudit = mysqlTable(
  "log_audit",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    waktu: datetime("waktu").notNull().default(sql`CURRENT_TIMESTAMP`),
    aktorId: char("aktor_id", { length: 26 }),
    ipAnonim: varchar("ip_anonim", { length: 45 }),
    aksi: varchar("aksi", { length: 100 }).notNull(),
    objekTipe: varchar("objek_tipe", { length: 50 }),
    objekId: varchar("objek_id", { length: 50 }),
    hasil: varchar("hasil", { length: 20 }).notNull(),
    meta: json("meta"),
  },
  (table) => [index("idx_log_audit_waktu").on(table.waktu), index("idx_log_audit_aksi").on(table.aksi)]
);

// 10. Tabel Batch Impor Data Anggota
export const imporBatch = mysqlTable(
  "impor_batch",
  {
    id: char("id", { length: 26 }).primaryKey(),
    penggunaId: char("pengguna_id", { length: 26 })
      .notNull()
      .references(() => pengguna.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["pratinjau", "tersimpan", "kedaluwarsa", "gagal"])
      .notNull()
      .default("pratinjau"),
    ringkasan: json("ringkasan").notNull(),
    kedaluwarsa: datetime("kedaluwarsa").notNull(),
    dibuatPada: timestamp("dibuat_pada").notNull().defaultNow(),
  },
  (table) => [index("idx_impor_batch_kedaluwarsa").on(table.kedaluwarsa)]
);

// 11. Tabel Pengaturan Sistem Perpustakaan
export const pengaturan = mysqlTable("pengaturan", {
  kunci: varchar("kunci", { length: 50 }).primaryKey(),
  nilai: text("nilai").notNull(),
  keterangan: varchar("keterangan", { length: 255 }),
  diperbaruiPada: timestamp("diperbarui_pada").notNull().defaultNow().onUpdateNow(),
});

// Relasi Antar Tabel (Drizzle Relations)
export const kategoriRelations = relations(kategori, ({ many }) => ({
  buku: many(buku),
}));

export const bukuRelations = relations(buku, ({ one, many }) => ({
  kategori: one(kategori, {
    fields: [buku.kategoriId],
    references: [kategori.id],
  }),
  eksemplar: many(eksemplar),
}));

export const eksemplarRelations = relations(eksemplar, ({ one, many }) => ({
  buku: one(buku, {
    fields: [eksemplar.bukuId],
    references: [buku.id],
  }),
  peminjaman: many(peminjaman),
}));

export const anggotaRelations = relations(anggota, ({ many }) => ({
  peminjaman: many(peminjaman),
  kunjungan: many(kunjungan),
}));

export const peminjamanRelations = relations(peminjaman, ({ one }) => ({
  anggota: one(anggota, {
    fields: [peminjaman.anggotaId],
    references: [anggota.id],
  }),
  eksemplar: one(eksemplar, {
    fields: [peminjaman.eksemplarId],
    references: [eksemplar.id],
  }),
  petugas: one(pengguna, {
    fields: [peminjaman.petugasId],
    references: [pengguna.id],
  }),
}));

export const kunjunganRelations = relations(kunjungan, ({ one }) => ({
  anggota: one(anggota, {
    fields: [kunjungan.anggotaId],
    references: [anggota.id],
  }),
}));
