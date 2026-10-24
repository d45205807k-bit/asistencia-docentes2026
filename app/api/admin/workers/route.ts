import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySameOrigin } from "@/lib/validation";

const workerSchema = z.object({
  dni: z.string().regex(/^\d{8}$/),
  apellidosNombres: z.string().trim().min(3).max(160),
  nivel: z.enum(["INICIAL", "PRIMARIA", "SECUNDARIA", "CETPRO"]),
  cargo: z.string().trim().min(1).max(120),
  condicion: z.string().max(80).optional().default(""),
  horasSemanales: z.coerce.number().int().min(0).max(80)
});

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = workerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Verifique los datos del trabajador." }, { status: 400 });
  try {
    const worker = await prisma.trabajador.create({ data: parsed.data });
    await prisma.auditLog.create({
      data: {
        accion: "ALTA_TRABAJADOR", detalle: `Alta de DNI ${worker.dni}.`,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
      }
    });
    return NextResponse.json({ id: worker.id }, { status: 201 });
  } catch {
    const existing = await prisma.trabajador.findUnique({ where: { dni: parsed.data.dni }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Ya existe un trabajador con ese DNI." }, { status: 409 });
    throw new Error("No se pudo guardar el trabajador.");
  }
}
