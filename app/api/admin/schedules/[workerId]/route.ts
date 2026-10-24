import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySameOrigin } from "@/lib/validation";

const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable();
const scheduleSchema = z.object({
  reason: z.string().trim().min(3).max(250),
  schedules: z.array(z.object({
    diaSemana: z.number().int().min(1).max(5),
    horaEntrada: timeSchema,
    horaSalida: timeSchema,
    toleranciaMin: z.number().int().min(0).max(120)
  })).length(5)
}).refine((value) => {
  const days = value.schedules.map((item) => item.diaSemana);
  return new Set(days).size === 5 && value.schedules.every((item) =>
    (item.horaEntrada === null && item.horaSalida === null) ||
    (item.horaEntrada !== null && item.horaSalida !== null && item.horaSalida > item.horaEntrada)
  );
}, { message: "Cada día debe tener ambas horas o quedar vacío; la salida debe ser posterior a la entrada." });

export async function PUT(request: Request, { params }: { params: Promise<{ workerId: string }> }) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const parsed = scheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revise las horas." }, { status: 400 });
  const { workerId } = await params;
  const worker = await prisma.trabajador.findUnique({ where: { id: workerId }, select: { id: true, dni: true } });
  if (!worker) return NextResponse.json({ error: "No se encontró al trabajador." }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    for (const schedule of parsed.data.schedules) {
      await tx.horario.upsert({
        where: { trabajadorId_diaSemana: { trabajadorId: worker.id, diaSemana: schedule.diaSemana } },
        update: { horaEntrada: schedule.horaEntrada, horaSalida: schedule.horaSalida, toleranciaMin: schedule.toleranciaMin },
        create: { trabajadorId: worker.id, ...schedule }
      });
    }
    await tx.auditLog.create({
      data: {
        accion: "CAMBIO_HORARIO", detalle: `DNI ${worker.dni}: ${parsed.data.reason}`,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
      }
    });
  });
  return NextResponse.json({ ok: true });
}
