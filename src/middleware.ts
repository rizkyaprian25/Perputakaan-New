import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cek keberadaan cookie sesi (sid atau __Host-sid)
  const token =
    request.cookies.get("sid")?.value ||
    request.cookies.get("__Host-sid")?.value;

  // 1. Proteksi Rute Admin: Alihkan ke halaman login jika belum memiliki sesi
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("alihkan", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Jika sudah memiliki sesi dan membuka halaman login, alihkan langsung ke dashboard
  if (pathname === "/admin/login" && token) {
    const adminUrl = new URL("/admin", request.url);
    return NextResponse.redirect(adminUrl);
  }

  const response = NextResponse.next();

  // 10 Standar Keamanan: Security Headers Defensif
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=()"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
