import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySameOrigin } from "@/lib/validation";

const schema = z.object({
  trabajadorId: z.string().min(1),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  motivo: z.enum(["LICENCIA", "PERMISO", "COMISION DE SERVICIO", "SALUD", "OTRO"]),
  observacion: z.string().trim().max(250).default("")
}).refine((value) => value.fechaInicio <= value.fechaFin, { message: "La fecha final debe ser igual o posterior a la inicial." });

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  const worker = await prisma.trabajador.findUnique({ where: { id: parsed.data.trabajadorId } });
  if (!worker) return NextResponse.json({ error: "No se encontró al trabajador." }, { status: 404 });
  const justification = await prisma.justificacion.create({ data: parsed.data });
  await prisma.auditLog.create({
    data: {
      accion: "ALTA_JUSTIFICACION",
      detalle: `DNI ${worker.dni}, ${justification.fechaInicio} a ${justification.fechaFin}, ${justification.motivo}.`,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
    }
  });
  return NextResponse.json({ id: justification.id }, { status: 201 });
}
