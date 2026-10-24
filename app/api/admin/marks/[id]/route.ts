import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateEntryState, calculateExitState } from "@/lib/asistencia";
import { verifySameOrigin } from "@/lib/validation";

const editSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
  tipo: z.enum(["ENTRADA", "SALIDA"]),
  motivo: z.string().trim().min(3).max(250)
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  const { id } = await params;
  const previous = await prisma.marcacion.findUnique({ where: { id }, include: { trabajador: true } });
  if (!previous) return NextResponse.json({ error: "No se encontró la marcación." }, { status: 404 });
  const time = parsed.data.hora.length === 5 ? `${parsed.data.hora}:00` : parsed.data.hora;
  const weekday = new Date(`${parsed.data.fecha}T12:00:00Z`).getUTCDay() || 7;
  const [schedule, holiday] = await Promise.all([
    prisma.horario.findUnique({ where: { trabajadorId_diaSemana: { trabajadorId: previous.trabajadorId, diaSemana: weekday } } }),
    prisma.feriado.findUnique({ where: { fecha: parsed.data.fecha } })
  ]);
  const hasSchedule = Boolean(schedule?.horaEntrada && schedule.horaSalida) && !holiday;
  const state = !hasSchedule
    ? { estado: "SIN_HORARIO", minutosTardanza: 0 }
    : parsed.data.tipo === "ENTRADA"
      ? calculateEntryState(time, schedule?.horaEntrada, schedule?.toleranciaMin)
      : calculateExitState(time, schedule?.horaSalida);
  try {
    await prisma.$transaction([
      prisma.marcacion.update({
        where: { id: previous.id },
        data: { fecha: parsed.data.fecha, horaMarcada: time, tipo: parsed.data.tipo, ...state, origen: "ADMIN" }
      }),
      prisma.auditLog.create({
        data: {
          accion: "EDICION_MARCACION",
          detalle: `DNI ${previous.trabajador.dni}, ${previous.fecha}/${previous.tipo} → ${parsed.data.fecha}/${parsed.data.tipo}: ${parsed.data.motivo}`,
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
        }
      })
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const duplicate = await prisma.marcacion.findFirst({
      where: { trabajadorId: previous.trabajadorId, fecha: parsed.data.fecha, tipo: parsed.data.tipo, id: { not: previous.id } }
    });
    if (duplicate) return NextResponse.json({ error: "Ya existe otra marcación de ese tipo para ese día." }, { status: 409 });
    throw error;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = z.object({ motivo: z.string().trim().min(3).max(250) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "El motivo de eliminación es obligatorio." }, { status: 400 });
  const { id } = await params;
  const mark = await prisma.marcacion.findUnique({ where: { id }, include: { trabajador: true } });
  if (!mark) return NextResponse.json({ error: "No se encontró la marcación." }, { status: 404 });
  await prisma.$transaction([
    prisma.marcacion.delete({ where: { id: mark.id } }),
    prisma.auditLog.create({
      data: {
        accion: "ELIMINACION_MARCACION",
        detalle: `DNI ${mark.trabajador.dni}, ${mark.fecha} ${mark.tipo}: ${parsed.data.motivo}`,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
      }
    })
  ]);
  return NextResponse.json({ ok: true });
}
