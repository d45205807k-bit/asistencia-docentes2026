import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAdminSession } from "@/lib/auth";
import { loginSchema, verifySameOrigin } from "@/lib/validation";

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ingrese la contraseña." }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const cutoff = new Date(Date.now() - 15 * 60_000);
  const failedAttempts = await prisma.auditLog.count({
    where: { accion: "LOGIN_FALLIDO", ip, fecha: { gte: cutoff } }
  });
  if (failedAttempts >= 5) {
    await prisma.auditLog.create({ data: { accion: "LOGIN_LIMITADO", detalle: "Límite de intentos alcanzado.", ip } });
    return NextResponse.json({ error: "Demasiados intentos. Intente nuevamente en 15 minutos." }, { status: 429 });
  }

  const setting = await prisma.configuracion.findUnique({ where: { clave: "adminPasswordHash" } });
  let hash = setting?.valor;
  if (!hash) {
    const initialPassword = process.env.ADMIN_PASSWORD;
    if (!initialPassword) {
      return NextResponse.json({ error: "Configure ADMIN_PASSWORD en el archivo .env antes de ingresar." }, { status: 503 });
    }
    hash = await bcrypt.hash(initialPassword, 12);
    await prisma.configuracion.create({ data: { clave: "adminPasswordHash", valor: hash } });
  }

  const valid = await bcrypt.compare(parsed.data.password, hash);
  if (!valid) {
    await prisma.auditLog.create({ data: { accion: "LOGIN_FALLIDO", detalle: "Contraseña incorrecta.", ip } });
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  await createAdminSession();
  await prisma.auditLog.create({ data: { accion: "LOGIN_ADMIN", detalle: "Inicio de sesión correcto.", ip } });
  return NextResponse.json({ ok: true });
}
