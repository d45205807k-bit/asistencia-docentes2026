import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySameOrigin } from "@/lib/validation";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = z.object({ motivo: z.string().trim().min(3).max(250) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "El motivo de eliminación es obligatorio." }, { status: 400 });
  const { id } = await params;
  const justification = await prisma.justificacion.findUnique({ where: { id }, include: { trabajador: true } });
  if (!justification) return NextResponse.json({ error: "No se encontró la justificación." }, { status: 404 });
  await prisma.$transaction([
    prisma.justificacion.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        accion: "ELIMINACION_JUSTIFICACION",
        detalle: `DNI ${justification.trabajador.dni}: ${parsed.data.motivo}`,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
      }
    })
  ]);
  return NextResponse.json({ ok: true });
}
