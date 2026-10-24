import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login" || request.nextUrl.pathname === "/api/admin/login") {
    return NextResponse.next();
  }
  const token = request.cookies.get("asistencia_admin")?.value;
  const key = process.env.JWT_SECRET;
  let valid = false;
  if (token && key && key.length >= 32) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(key));
      valid = payload.role === "admin";
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesión de administrador requerida." }, { status: 401 });
    }
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
