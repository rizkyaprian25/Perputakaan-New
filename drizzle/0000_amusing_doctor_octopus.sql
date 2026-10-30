CREATE TABLE `anggota` (
	`id` char(26) NOT NULL,
	`nomor_induk` varchar(25) NOT NULL,
	`nama` varchar(150) NOT NULL,
	`jenis` enum('siswa','guru','staf') NOT NULL DEFAULT 'siswa',
	`kelas` varchar(50),
	`qr_token` varchar(32) NOT NULL,
	`status` enum('aktif','nonaktif','lulus') NOT NULL DEFAULT 'aktif',
	`dibuat_pada` timestamp NOT NULL DEFAULT (now()),
	`diperbarui_pada` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `anggota_id` PRIMARY KEY(`id`),
	CONSTRAINT `anggota_nomor_induk_unique` UNIQUE(`nomor_induk`),
	CONSTRAINT `anggota_qr_token_unique` UNIQUE(`qr_token`),
	CONSTRAINT `uq_anggota_nomor_induk` UNIQUE(`nomor_induk`),
	CONSTRAINT `uq_anggota_qr_token` UNIQUE(`qr_token`)
);
--> statement-breakpoint
CREATE TABLE `buku` (
	`id` char(26) NOT NULL,
	`isbn` varchar(20),
	`judul` varchar(300) NOT NULL,
	`penulis` varchar(300) NOT NULL,
	`penerbit` varchar(200),
	`tahun_terbit` int,
	`jumlah_halaman` int,
	`sinopsis` text,
	`sampul_berkas` varchar(255),
	`kategori_id` char(26) NOT NULL,
	`lokasi_rak` varchar(50),
	`sumber` enum('manual','google_books','open_library') NOT NULL DEFAULT 'manual',
	`id_sumber` varchar(100),
	`dihapus_pada` datetime,
	`dibuat_pada` timestamp NOT NULL DEFAULT (now()),
	`diperbarui_pada` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buku_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eksemplar` (
	`id` char(26) NOT NULL,
	`buku_id` char(26) NOT NULL,
	`kode` varchar(30) NOT NULL,
	`status` enum('tersedia','dipinjam','hilang','rusak') NOT NULL DEFAULT 'tersedia',
	`dibuat_pada` timestamp NOT NULL DEFAULT (now()),
	`diperbarui_pada` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eksemplar_id` PRIMARY KEY(`id`),
	CONSTRAINT `eksemplar_kode_unique` UNIQUE(`kode`),
	CONSTRAINT `uq_eksemplar_kode` UNIQUE(`kode`)
);
--> statement-breakpoint
CREATE TABLE `impor_batch` (
	`id` char(26) NOT NULL,
	`pengguna_id` char(26) NOT NULL,
	`status` enum('pratinjau','tersimpan','kedaluwarsa','gagal') NOT NULL DEFAULT 'pratinjau',
	`ringkasan` json NOT NULL,
	`kedaluwarsa` datetime NOT NULL,
	`dibuat_pada` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `impor_batch_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kategori` (
	`id` char(26) NOT NULL,
	`kelompok` enum('hiburan','pelajaran') NOT NULL,
	`nama` varchar(100) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`dibuat_pada` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kategori_id` PRIMARY KEY(`id`),
	CONSTRAINT `kategori_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `uq_kategori_kelompok_nama` UNIQUE(`kelompok`,`nama`),
	CONSTRAINT `uq_kategori_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `kunjungan` (
	`id` char(26) NOT NULL,
	`anggota_id` char(26) NOT NULL,
	`tanggal` date NOT NULL,
	`waktu` datetime NOT NULL,
	`metode` enum('qr','manual') NOT NULL DEFAULT 'qr',
	`kiosk_label` varchar(50),
	CONSTRAINT `kunjungan_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_kunjungan_harian` UNIQUE(`anggota_id`,`tanggal`)
);
--> statement-breakpoint
CREATE TABLE `log_audit` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`waktu` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`aktor_id` char(26),
	`ip_anonim` varchar(45),
	`aksi` varchar(100) NOT NULL,
	`objek_tipe` varchar(50),
	`objek_id` varchar(50),
	`hasil` varchar(20) NOT NULL,
	`meta` json,
	CONSTRAINT `log_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peminjaman` (
	`id` char(26) NOT NULL,
	`anggota_id` char(26) NOT NULL,
	`eksemplar_id` char(26) NOT NULL,
	`petugas_id` char(26) NOT NULL,
	`petugas_kembali_id` char(26),
	`dipinjam_pada` datetime NOT NULL,
	`jatuh_tempo` datetime NOT NULL,
	`dikembalikan_pada` datetime,
	`perpanjangan_ke` int NOT NULL DEFAULT 0,
	`kunci_idempoten` varchar(64),
	`batch_id` varchar(36),
	`denda_rp` int NOT NULL DEFAULT 0,
	`aktif_eksemplar_id` char(26),
	CONSTRAINT `peminjaman_id` PRIMARY KEY(`id`),
	CONSTRAINT `peminjaman_kunci_idempoten_unique` UNIQUE(`kunci_idempoten`),
	CONSTRAINT `uq_eksemplar_aktif` UNIQUE(`aktif_eksemplar_id`)
);
--> statement-breakpoint
CREATE TABLE `pengaturan` (
	`kunci` varchar(50) NOT NULL,
	`nilai` text NOT NULL,
	`keterangan` varchar(255),
	`diperbarui_pada` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pengaturan_kunci` PRIMARY KEY(`kunci`)
);
--> statement-breakpoint
CREATE TABLE `pengguna` (
	`id` char(26) NOT NULL,
	`username` varchar(50) NOT NULL,
	`kata_sandi_hash` varchar(255) NOT NULL,
	`peran` enum('admin','petugas') NOT NULL DEFAULT 'petugas',
	`aktif` boolean NOT NULL DEFAULT true,
	`gagal_login` int NOT NULL DEFAULT 0,
	`terkunci_hingga` datetime,
	`totp_secret_enc` text,
	`dibuat_pada` timestamp NOT NULL DEFAULT (now()),
	`diperbarui_pada` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pengguna_id` PRIMARY KEY(`id`),
	CONSTRAINT `pengguna_username_unique` UNIQUE(`username`),
	CONSTRAINT `uq_pengguna_username` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `sesi` (
	`token_hash` char(64) NOT NULL,
	`pengguna_id` char(26) NOT NULL,
	`kedaluwarsa_idle` datetime NOT NULL,
	`kedaluwarsa_absolut` datetime NOT NULL,
	`ip_anonim` varchar(45),
	`agen_ringkas` varchar(255),
	`dibuat_pada` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sesi_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `buku` ADD CONSTRAINT `buku_kategori_id_kategori_id_fk` FOREIGN KEY (`kategori_id`) REFERENCES `kategori`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eksemplar` ADD CONSTRAINT `eksemplar_buku_id_buku_id_fk` FOREIGN KEY (`buku_id`) REFERENCES `buku`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `impor_batch` ADD CONSTRAINT `impor_batch_pengguna_id_pengguna_id_fk` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kunjungan` ADD CONSTRAINT `kunjungan_anggota_id_anggota_id_fk` FOREIGN KEY (`anggota_id`) REFERENCES `anggota`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `peminjaman` ADD CONSTRAINT `peminjaman_anggota_id_anggota_id_fk` FOREIGN KEY (`anggota_id`) REFERENCES `anggota`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `peminjaman` ADD CONSTRAINT `peminjaman_eksemplar_id_eksemplar_id_fk` FOREIGN KEY (`eksemplar_id`) REFERENCES `eksemplar`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `peminjaman` ADD CONSTRAINT `peminjaman_petugas_id_pengguna_id_fk` FOREIGN KEY (`petugas_id`) REFERENCES `pengguna`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `peminjaman` ADD CONSTRAINT `peminjaman_petugas_kembali_id_pengguna_id_fk` FOREIGN KEY (`petugas_kembali_id`) REFERENCES `pengguna`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sesi` ADD CONSTRAINT `sesi_pengguna_id_pengguna_id_fk` FOREIGN KEY (`pengguna_id`) REFERENCES `pengguna`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_anggota_status_kelas` ON `anggota` (`status`,`kelas`);--> statement-breakpoint
CREATE INDEX `idx_buku_kategori_id` ON `buku` (`kategori_id`);--> statement-breakpoint
CREATE INDEX `idx_buku_isbn` ON `buku` (`isbn`);--> statement-breakpoint
CREATE INDEX `idx_buku_dihapus_pada` ON `buku` (`dihapus_pada`);--> statement-breakpoint
CREATE INDEX `idx_eksemplar_buku_status` ON `eksemplar` (`buku_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_impor_batch_kedaluwarsa` ON `impor_batch` (`kedaluwarsa`);--> statement-breakpoint
CREATE INDEX `idx_kunjungan_tanggal` ON `kunjungan` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_log_audit_waktu` ON `log_audit` (`waktu`);--> statement-breakpoint
CREATE INDEX `idx_log_audit_aksi` ON `log_audit` (`aksi`);--> statement-breakpoint
CREATE INDEX `idx_peminjaman_anggota_kembali` ON `peminjaman` (`anggota_id`,`dikembalikan_pada`);--> statement-breakpoint
CREATE INDEX `idx_peminjaman_jatuh_tempo` ON `peminjaman` (`jatuh_tempo`);--> statement-breakpoint
CREATE INDEX `idx_sesi_pengguna_id` ON `sesi` (`pengguna_id`);