# ADR 0003: Autentikasi Menggunakan Sesi Opaque Server-Side vs JWT

- **Status:** Diterima (Accepted)
- **Tanggal:** 2026-10-30
- **Pengambil Keputusan:** Tim Arsitektur Bilik Baca

## Konteks & Latar Belakang
Sistem perpustakaan memerlukan keamanan sesi petugas dan admin yang dapat dicabut (*revocation*) sewaktu-waktu (misal saat logout atau deteksi anomali login).

## Keputusan
Menolak JWT (JSON Web Token) tanpa state, dan memilih **Sesi Opaque Server-Side**:
1. Token acak 256-bit (CSPRNG) dikirim ke browser via cookie `HttpOnly; Secure; SameSite=Strict; Path=/`.
2. Server hanya menyimpan nilai hash SHA-256 dari token di tabel `sesi`.
3. Sesi memiliki batas *idle timeout* 30 menit dan batas absolut 8 jam.

## Konsekuensi & Justifikasi
1. **Pencabutan Instan:** Logout atau pembatalan akses langsung efektif seketika dengan menghapus record di database.
2. **Perlindungan Terhadap XSS:** Cookie `HttpOnly` tidak dapat diakses oleh skrip JavaScript di browser.
