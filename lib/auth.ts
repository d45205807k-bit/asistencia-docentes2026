import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "asistencia_admin";

function secret() {
  const key = process.env.JWT_SECRET;
  if (!key || key.length < 32) {
    throw new Error("JWT_SECRET debe tener al menos 32 caracteres.");
  }
  return new TextEncoder().encode(key);
}

export async function createAdminSession() {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("4h")
    .sign(secret());
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 4 * 60 * 60
  });
}

export async function isAdminSession(token?: string) {
  const cookieStore = await cookies();
  const value = token ?? cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return false;
  try {
    const { payload } = await jwtVerify(value, secret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
}
