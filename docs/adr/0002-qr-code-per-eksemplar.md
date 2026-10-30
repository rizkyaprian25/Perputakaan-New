# ADR 0002: Pelabelan Kode QR Per Eksemplar Fisik Buku

- **Status:** Diterima (Accepted)
- **Tanggal:** 2026-10-30
- **Pengambil Keputusan:** Tim Arsitektur Bilik Baca

## Konteks & Latar Belakang
Satu judul buku di perpustakaan sering kali memiliki banyak eksemplar fisik (misal: novel "Laskar Pelangi" memiliki 5 buku fisik). Jika kode QR dicetak berdasarkan ISBN atau Judul Buku, petugas tidak dapat membedakan salinan fisik mana yang sedang dipinjam oleh siswa A atau salinan mana yang hilang/rusak.

## Keputusan
Setiap **eksemplar fisik buku** memiliki kode unik tersendiri (format: `PUS1:B:<kode_eksemplar>`). Ketika judul baru ditambahkan dengan jumlah N eksemplar, sistem secara otomatis membangkitkan N baris eksemplar dengan kode unik berurutan.

## Konsekuensi & Justifikasi
1. **Ketepatan Status:** Sistem dapat melacak secara presisi kondisi, riwayat sirkulasi, dan keberadaan setiap buku fisik.
2. **Kecepatan Pengembalian:** Petugas cukup memindai QR pada buku tanpa perlu mencari nama peminjam terlebih dahulu.
