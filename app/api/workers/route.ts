import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dniSchema } from "@/lib/validation";
import { checkRequestLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await checkRequestLimit("consulta-dni", ip, 30)) {
    return NextResponse.json({ error: "Se alcanzó el límite de consultas. Espere un minuto." }, { status: 429 });
  }
  const parsed = dniSchema.safeParse(new URL(request.url).searchParams.get("dni"));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "DNI inválido." }, { status: 400 });
  const trabajador = await prisma.trabajador.findFirst({
    where: { dni: parsed.data, activo: true },
    select: { dni: true, apellidosNombres: true, nivel: true, cargo: true }
  });
  if (!trabajador) return NextResponse.json({ error: "No encontramos un trabajador activo con ese DNI." }, { status: 404 });
  return NextResponse.json({ trabajador });
}
