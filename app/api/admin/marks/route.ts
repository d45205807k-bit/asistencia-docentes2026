import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateEntryState, calculateExitState } from "@/lib/asistencia";
import { verifySameOrigin } from "@/lib/validation";

const schema = z.object({
  trabajadorId: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
  tipo: z.enum(["ENTRADA", "SALIDA"]),
  motivo: z.string().trim().min(3).max(250)
});

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  const worker = await prisma.trabajador.findUnique({ where: { id: parsed.data.trabajadorId } });
  if (!worker) return NextResponse.json({ error: "No se encontró al trabajador." }, { status: 404 });
  const [hour, minute, second = "00"] = parsed.data.hora.split(":");
  const time = `${hour}:${minute}:${second}`;
  const day = new Date(`${parsed.data.fecha}T12:00:00Z`).getUTCDay() || 7;
  const [schedule, holiday] = await Promise.all([
    prisma.horario.findUnique({ where: { trabajadorId_diaSemana: { trabajadorId: worker.id, diaSemana: day } } }),
    prisma.feriado.findUnique({ where: { fecha: parsed.data.fecha } })
  ]);
  const hasSchedule = Boolean(schedule?.horaEntrada && schedule.horaSalida) && !holiday;
  const state = !hasSchedule
    ? { estado: "SIN_HORARIO", minutosTardanza: 0 }
    : parsed.data.tipo === "ENTRADA"
      ? calculateEntryState(time, schedule?.horaEntrada, schedule?.toleranciaMin)
      : calculateExitState(time, schedule?.horaSalida);
  try {
    const mark = await prisma.marcacion.create({
      data: {
        trabajadorId: worker.id, fecha: parsed.data.fecha, horaMarcada: time,
        tipo: parsed.data.tipo, ...state, origen: "ADMIN"
      }
    });
    await prisma.auditLog.create({
      data: {
        accion: "ALTA_MARCACION_MANUAL",
        detalle: `DNI ${worker.dni}, ${mark.fecha} ${mark.tipo}: ${parsed.data.motivo}`,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
      }
    });
    return NextResponse.json({ id: mark.id }, { status: 201 });
  } catch (error) {
    const duplicate = await prisma.marcacion.findFirst({
      where: { trabajadorId: worker.id, fecha: parsed.data.fecha, tipo: parsed.data.tipo }
    });
    if (duplicate) return NextResponse.json({ error: "Ya existe una marcación de ese tipo para ese día." }, { status: 409 });
    throw error;
  }
}
