import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySameOrigin } from "@/lib/validation";

const updateSchema = z.object({
  apellidosNombres: z.string().trim().min(3).max(160).optional(),
  nivel: z.enum(["INICIAL", "PRIMARIA", "SECUNDARIA", "CETPRO"]).optional(),
  cargo: z.string().trim().min(1).max(120).optional(),
  condicion: z.string().max(80).optional(),
  horasSemanales: z.number().int().min(0).max(80).optional(),
  activo: z.boolean().optional(),
  motivo: z.string().trim().min(3).max(250)
}).refine((value) => Object.keys(value).some((key) => key !== "motivo"), {
  message: "Indique un dato para actualizar."
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  const { motivo, ...data } = parsed.data;
  const { id } = await params;
  const worker = await prisma.trabajador.findUnique({ where: { id } });
  if (!worker) return NextResponse.json({ error: "No se encontró al trabajador." }, { status: 404 });
  await prisma.$transaction([
    prisma.trabajador.update({ where: { id }, data }),
    prisma.auditLog.create({
      data: {
        accion: "EDICION_TRABAJADOR", detalle: `DNI ${worker.dni}: ${motivo}`,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
      }
    })
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = z.object({ motivo: z.string().trim().min(3).max(250) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "El motivo de baja es obligatorio." }, { status: 400 });
  const { id } = await params;
  const worker = await prisma.trabajador.findUnique({ where: { id } });
  if (!worker) return NextResponse.json({ error: "No se encontró al trabajador." }, { status: 404 });
  await prisma.$transaction([
    prisma.trabajador.update({ where: { id: worker.id }, data: { activo: false } }),
    prisma.auditLog.create({
      data: {
        accion: "BAJA_TRABAJADOR", detalle: `DNI ${worker.dni}: ${parsed.data.motivo}`,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
      }
    })
  ]);
  return NextResponse.json({ ok: true });
}
