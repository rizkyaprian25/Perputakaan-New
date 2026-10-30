/**
 * Bilik Baca - Skrip Pengujian Smoke Test (Runnable Check)
 * Menguji invariant kritis:
 * 1. Koneksi MySQL Laragon & Keberadaan Master Data (Kategori, Anggota Siswa Netri SMS)
 * 2. Transaksi Sirkulasi Atomik: Pinjam & Deteksi Pinjam Ganda
 * 3. Idempotensi Presensi Kiosk Harian
 * 4. Pengembalian Buku & Pembebasan Eksemplar
 */

import { pool } from "../src/db";
import { ulid } from "ulid";
import assert from "assert";

async function main() {
  console.log("=== MEMULAI SMOKE TEST BILIK BACA ===");

  const connection = await pool.getConnection();

  try {
    // -------------------------------------------------------------------------
    // 1. Uji Master Data Siswa dari Netri SMS
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Memeriksa Master Data Hasil Sinkronisasi Netri SMS...");
    const [siswaList] = await connection.query(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'aktif' THEN 1 ELSE 0 END) as aktif FROM anggota WHERE jenis = 'siswa'"
    );
    const totalSiswa = (siswaList as any)[0].total;
    const siswaAktif = (siswaList as any)[0].aktif;
    console.log(`-> Ditemukan ${totalSiswa} siswa (${siswaAktif} aktif).`);
    assert(totalSiswa >= 880, "Data siswa dari Netri SMS harus minimal 880 record");
    console.log("-> [LULUS] Master data Netri SMS terverifikasi utuh.");

    // -------------------------------------------------------------------------
    // 2. Uji Persiapan Buku, Petugas & Eksemplar Uji Coba
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Menyiapkan Buku & Eksemplar Uji Coba Sirkulasi...");
    const testIsbn = "978-SMOKE-" + Date.now().toString().slice(-6);
    const bukuId = ulid();
    const eksemplarId = ulid();
    const barcodeUji = "BB-" + Date.now().toString().slice(-6);

    // Ambil 1 kategori
    const [kat] = await connection.query("SELECT id FROM kategori LIMIT 1");
    const kategoriId = (kat as any)[0].id;

    // Ambil 1 petugas
    const [petugasRows] = await connection.query("SELECT id FROM pengguna LIMIT 1");
    const petugasId = (petugasRows as any)[0].id;

    // Ambil 1 siswa aktif
    const [siswa] = await connection.query(
      "SELECT id, nama, nomor_induk FROM anggota WHERE jenis = 'siswa' AND status = 'aktif' LIMIT 1"
    );
    const anggotaUji = (siswa as any)[0];
    console.log(`-> Menggunakan siswa penguji: ${anggotaUji.nama} (${anggotaUji.nomor_induk})`);

    // Masukkan buku uji
    await connection.query(
      `INSERT INTO buku (id, isbn, judul, penulis, penerbit, tahun_terbit, kategori_id)
       VALUES (?, ?, 'Buku Uji Otomasi Smoke Test', 'Tim Pengembang', 'Pustaka Uji', 2026, ?)`,
      [bukuId, testIsbn, kategoriId]
    );

    // Masukkan eksemplar uji (tersedia)
    await connection.query(
      `INSERT INTO eksemplar (id, buku_id, kode, status)
       VALUES (?, ?, ?, 'tersedia')`,
      [eksemplarId, bukuId, barcodeUji]
    );
    console.log("-> [LULUS] Buku & Eksemplar uji coba berhasil dibuat.");

    // -------------------------------------------------------------------------
    // 3. Uji Sirkulasi Atomik: Peminjaman
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Menguji Transaksi Peminjaman Atomik...");
    const peminjamanId = ulid();
    const batchId = ulid();
    const now = new Date();
    const jatuhTempo = new Date(now.getTime() + 7 * 86400000);

    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO peminjaman (id, anggota_id, eksemplar_id, petugas_id, dipinjam_pada, jatuh_tempo, batch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [peminjamanId, anggotaUji.id, eksemplarId, petugasId, now, jatuhTempo, batchId]
    );
    await connection.query("UPDATE eksemplar SET status = 'dipinjam' WHERE id = ?", [eksemplarId]);
    await connection.commit();

    // Verifikasi eksemplar berubah status
    const [eksCek] = await connection.query("SELECT status FROM eksemplar WHERE id = ?", [eksemplarId]);
    assert.strictEqual((eksCek as any)[0].status, "dipinjam", "Status eksemplar harus 'dipinjam'");
    console.log("-> [LULUS] Transaksi peminjaman berhasil dicatat & status eksemplar terkunci.");

    // -------------------------------------------------------------------------
    // 4. Uji Invariant Anti-Pinjam-Ganda (Database Hard Constraint)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Menguji Invariant Anti-Pinjam-Ganda (Hardware / DB Level)...");
    let tertangkap = false;
    try {
      const pinjamGandaId = ulid();
      // Upaya meminjam eksemplar yang sama saat masih dipinjam
      await connection.query(
        `INSERT INTO peminjaman (id, anggota_id, eksemplar_id, petugas_id, dipinjam_pada, jatuh_tempo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [pinjamGandaId, anggotaUji.id, eksemplarId, petugasId, now, jatuhTempo]
      );
    } catch (err: any) {
      tertangkap = true;
      console.log("-> Terdeteksi pelanggaran UNIQUE constraint aktif_eksemplar_id:", err.code);
      assert(err.code === "ER_DUP_ENTRY", "Harus menolak dengan ER_DUP_ENTRY");
    }
    assert(tertangkap, "Sistem DB wajib menolak peminjaman ganda pada eksemplar yang sama");
    console.log("-> [LULUS] Constraint anti-pinjam-ganda terbukti bekerja di level basis data!");

    // -------------------------------------------------------------------------
    // 5. Uji Sirkulasi Atomik: Pengembalian Buku
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Menguji Pengembalian Buku & Pembebasan Eksemplar...");
    await connection.beginTransaction();
    await connection.query(
      `UPDATE peminjaman 
       SET dikembalikan_pada = NOW(), petugas_kembali_id = ? 
       WHERE id = ?`,
      [petugasId, peminjamanId]
    );
    await connection.query("UPDATE eksemplar SET status = 'tersedia' WHERE id = ?", [eksemplarId]);
    await connection.commit();

    const [eksKembali] = await connection.query("SELECT status FROM eksemplar WHERE id = ?", [eksemplarId]);
    assert.strictEqual((eksKembali as any)[0].status, "tersedia", "Eksemplar harus kembali berstatus 'tersedia'");
    console.log("-> [LULUS] Pengembalian buku sukses & eksemplar kembali tersedia.");

    // -------------------------------------------------------------------------
    // 6. Uji Presensi Kiosk: Idempotensi Harian
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Menguji Presensi Kiosk Harian & Idempotensi...");
    const tglHariIni = new Date().toISOString().split("T")[0];
    const kunjunganId = ulid();

    // Hapus kunjungan penguji hari ini jika ada sisa uji
    await connection.query("DELETE FROM kunjungan WHERE anggota_id = ? AND tanggal = ?", [
      anggotaUji.id,
      tglHariIni,
    ]);

    // Presensi pertama
    await connection.query(
      `INSERT INTO kunjungan (id, anggota_id, tanggal, waktu, metode)
       VALUES (?, ?, ?, NOW(), 'qr')`,
      [kunjunganId, anggotaUji.id, tglHariIni]
    );
    console.log("-> Presensi pertama berhasil dicatat.");

    // Presensi kedua di hari yang sama (harus ditolak oleh uq_kunjungan_harian)
    let presensiGandaTertolak = false;
    try {
      const gandaId = ulid();
      await connection.query(
        `INSERT INTO kunjungan (id, anggota_id, tanggal, waktu, metode)
         VALUES (?, ?, ?, NOW(), 'qr')`,
        [gandaId, anggotaUji.id, tglHariIni]
      );
    } catch (err: any) {
      presensiGandaTertolak = true;
      assert(err.code === "ER_DUP_ENTRY", "Presensi ganda harus melempar ER_DUP_ENTRY");
    }
    assert(presensiGandaTertolak, "Presensi ganda di hari yang sama wajib dicegah oleh skema database");
    console.log("-> [LULUS] Idempotensi presensi harian terbukti bekerja 100%!");

    // -------------------------------------------------------------------------
    // Pembersihan Data Uji
    // -------------------------------------------------------------------------
    console.log("\n[BERSIH-BERSIH] Membersihkan data uji coba...");
    await connection.query("DELETE FROM kunjungan WHERE id = ?", [kunjunganId]);
    await connection.query("DELETE FROM peminjaman WHERE id = ?", [peminjamanId]);
    await connection.query("DELETE FROM eksemplar WHERE id = ?", [eksemplarId]);
    await connection.query("DELETE FROM buku WHERE id = ?", [bukuId]);
    console.log("-> [LULUS] Data uji berhasil dibersihkan.");

    console.log("\n=======================================================");
    console.log("SEMUA PENGUJIAN SMOKE TEST BERHASIL LULUS DENGAN SEMPURNA! (6/6)");
    console.log("=======================================================");
  } catch (error) {
    console.error("\n[GAGAL] Smoke test menemui kegagalan:", error);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
