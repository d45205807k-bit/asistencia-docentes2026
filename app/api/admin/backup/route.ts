import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    return NextResponse.json({ error: "La descarga directa solo está disponible con SQLite." }, { status: 501 });
  }
  const configuredPath = databaseUrl.slice("file:".length).split("?")[0];
  const databasePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), "prisma", configuredPath);
  let data: Buffer;
  try {
    data = await readFile(databasePath);
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo de respaldo de la base de datos." }, { status: 500 });
  }
  await prisma.auditLog.create({
    data: {
      accion: "RESPALDO_BASE_DATOS", detalle: "Descarga del respaldo SQLite.",
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
    }
  });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="respaldo-asistencia-${new Date().toISOString().slice(0, 10)}.db"`
    }
  });
}
