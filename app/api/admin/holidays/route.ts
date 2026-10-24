import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySameOrigin } from "@/lib/validation";

const schema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(`${value}T12:00:00Z`))),
  descripcion: z.string().trim().min(2).max(160)
});

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ingrese una fecha y descripción válidas." }, { status: 400 });
  const holiday = await prisma.feriado.upsert({
    where: { fecha: parsed.data.fecha },
    update: { descripcion: parsed.data.descripcion },
    create: parsed.data
  });
  await prisma.auditLog.create({
    data: { accion: "CAMBIO_FERIADO", detalle: `${holiday.fecha}: ${holiday.descripcion}`, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "" }
  });
  return NextResponse.json({ id: holiday.id });
}
