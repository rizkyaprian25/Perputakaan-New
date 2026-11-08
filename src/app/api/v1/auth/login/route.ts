/**
 * Perpustakaan NETRI - API Autentikasi Login Admin / Petugas
 * Standar Keamanan: Argon2id, lockout progresif, anti user-enumeration, cookie HttpOnly.
 */

import { NextRequest } from "next/server";
import * as argon2 from "@node-rs/argon2";
import { db } from "@/db";
import { pengguna, sesi } from "@/db/schema";
import { eq } from "drizzle-orm";
import { LoginSkema } from "@/contracts/skema";
import { responSukses, responGalat } from "@/lib/api-response";
import { bangkitkanTokenSesi, hashTokenSesi, NAMA_COOKIE_SESI, APAKAH_COOKIE_SECURE } from "@/lib/auth";
import { tulisLogAudit } from "@/lib/audit";

// Dummy hash Argon2id untuk timing-attack mitigation saat user tidak ditemukan
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0MTIzNA$1111111111111111111111111111111111111111111";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parse = LoginSkema.safeParse(json);

    if (!parse.success) {
      return responGalat("Data login tidak valid", 400);
    }

    const { username, kataSandi } = parse.data;
    const now = new Date();

    // Cari pengguna di database
    const user = await db.query.pengguna.findFirst({
      where: eq(pengguna.username, username),
    });

    // Cek apakah akun sedang terkunci (Lockout 15 menit)
    if (user && user.terkunciHingga && new Date(user.terkunciHingga) > now) {
      const sisaMenit = Math.ceil(
        (new Date(user.terkunciHingga).getTime() - now.getTime()) / (60 * 1000)
      );
      await tulisLogAudit({
        aktorId: user.id,
        aksi: "AUTH_LOGIN_DITOLAK_TERKUNCI",
        hasil: "gagal",
        meta: { username, sisaMenit },
      });
      return responGalat(
        `Akun terkunci sementara karena terlalu banyak percobaan salah. Coba lagi dalam ${sisaMenit} menit.`,
        429
      );
    }

    // Verifikasi kata sandi dengan Argon2id
    const targetHash = user?.kataSandiHash || DUMMY_HASH;
    let passwordCocok = false;

    try {
      passwordCocok = await argon2.verify(targetHash, kataSandi);
    } catch {
      passwordCocok = false;
    }

    // Jika user tidak ada atau password salah (Pesan generik anti user-enumeration)
    if (!user || !passwordCocok || !user.aktif) {
      if (user) {
        const gagalBaru = (user.gagalLogin || 0) + 1;
        const lockMinutes = Number(process.env.LOGIN_LOCK_MINUTES || 15);
        const maxFails = Number(process.env.LOGIN_MAX_FAILS || 5);

        const terkunciBaru =
          gagalBaru >= maxFails
            ? new Date(Date.now() + lockMinutes * 60 * 1000)
            : null;

        await db
          .update(pengguna)
          .set({
            gagalLogin: gagalBaru,
            terkunciHingga: terkunciBaru,
          })
          .where(eq(pengguna.id, user.id));

        await tulisLogAudit({
          aktorId: user.id,
          aksi: terkunciBaru ? "AUTH_LOCKOUT_AKTIF" : "AUTH_LOGIN_GAGAL",
          hasil: "gagal",
          meta: { username, gagalLogin: gagalBaru },
        });
      }

      return responGalat("Username atau kata sandi tidak cocok.", 401);
    }

    // Login Sukses: Reset hitungan gagal login
    await db
      .update(pengguna)
      .set({
        gagalLogin: 0,
        terkunciHingga: null,
      })
      .where(eq(pengguna.id, user.id));

    // Buat token sesi acak baru
    const tokenSesi = bangkitkanTokenSesi();
    const tokenHash = hashTokenSesi(tokenSesi);

    const idleMinutes = Number(process.env.SESSION_IDLE_MINUTES || 30);
    const absHours = Number(process.env.SESSION_ABSOLUTE_HOURS || 8);

    const kedaluwarsaIdle = new Date(Date.now() + idleMinutes * 60 * 1000);
    const kedaluwarsaAbsolut = new Date(Date.now() + absHours * 60 * 60 * 1000);

    await db.insert(sesi).values({
      tokenHash,
      penggunaId: user.id,
      kedaluwarsaIdle,
      kedaluwarsaAbsolut,
      ipAnonim: "127.0.0.1",
      agenRingkas: req.headers.get("user-agent")?.slice(0, 255) || null,
    });

    await tulisLogAudit({
      aktorId: user.id,
      aksi: "AUTH_LOGIN_SUKSES",
      hasil: "sukses",
      meta: { username: user.username, peran: user.peran },
    });

    const respon = responSukses(
      {
        id: user.id,
        username: user.username,
        peran: user.peran,
      },
      "Login berhasil"
    );

    // Set cookie sesi aman
    respon.cookies.set({
      name: NAMA_COOKIE_SESI,
      value: tokenSesi,
      httpOnly: true,
      secure: APAKAH_COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: absHours * 3600,
    });

    return respon;
  } catch (error) {
    console.error("Kesalahan internal login:", error);
    return responGalat("Terjadi kendala pada server saat memproses login", 500);
  }
}
