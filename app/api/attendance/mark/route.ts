import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateEntryState, calculateExitState, nextMarkType } from "@/lib/asistencia";
import { limaDateTime } from "@/lib/time";
import { markSchema, verifySameOrigin } from "@/lib/validation";
import { checkRequestLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await checkRequestLimit("marca", ip, 20)) return NextResponse.json({ error: "Se alcanzó el límite de intentos. Espere un minuto." }, { status: 429 });
  const parsed = markSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });

  const worker = await prisma.trabajador.findFirst({ where: { dni: parsed.data.dni, activo: true } });
  if (!worker) return NextResponse.json({ error: "No encontramos un trabajador activo con ese DNI." }, { status: 404 });

  const settings = await prisma.configuracion.findMany({
    where: { clave: { in: ["geofenceEnabled", "geofenceLat", "geofenceLng", "geofenceRadius", "toleranciaGlobal"] } }
  });
  const config = Object.fromEntries(settings.map((item) => [item.clave, item.valor]));
  if (config.geofenceEnabled === "true") {
    const centerLat = Number(config.geofenceLat);
    const centerLng = Number(config.geofenceLng);
    const radius = Number(config.geofenceRadius);
    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng) || !Number.isFinite(radius) || radius <= 0) {
      return NextResponse.json({ error: "La geovalla está activada pero falta configurarla. Contacte al administrador." }, { status: 503 });
    }
    if (parsed.data.latitud === undefined || parsed.data.longitud === undefined) {
      return NextResponse.json({ error: "Debe permitir el acceso a su ubicación para marcar asistencia." }, { status: 400 });
    }
    const toRadians = (degrees: number) => degrees * Math.PI / 180;
    const dLat = toRadians(parsed.data.latitud - centerLat);
    const dLng = toRadians(parsed.data.longitud - centerLng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(centerLat)) * Math.cos(toRadians(parsed.data.latitud)) * Math.sin(dLng / 2) ** 2;
    const distance = 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (distance > radius) return NextResponse.json({ error: "Estás fuera del área permitida para marcar asistencia." }, { status: 403 });
  }

  const now = new Date();
  const { fecha, hora, diaSemana } = limaDateTime(now);
  const todayMarks = await prisma.marcacion.findMany({
    where: { trabajadorId: worker.id, fecha },
    orderBy: { creadoEn: "asc" }
  });
  const next = nextMarkType(todayMarks, now);
  if (next.error === "DUPLICADA") {
    return NextResponse.json({ error: "Espera 2 minutos antes de volver a marcar." }, { status: 429 });
  }
  if (next.error === "COMPLETA") {
    return NextResponse.json({ error: "Ya registraste ingreso y salida hoy." }, { status: 409 });
  }

  const tipo = next.tipo!;
  const [horario, holiday] = await Promise.all([
    prisma.horario.findUnique({ where: { trabajadorId_diaSemana: { trabajadorId: worker.id, diaSemana } } }),
    prisma.feriado.findUnique({ where: { fecha } })
  ]);
  const hasSchedule = Boolean(horario?.horaEntrada && horario?.horaSalida) && !holiday;
  const state = !hasSchedule
    ? { estado: "SIN_HORARIO", minutosTardanza: 0 }
    : tipo === "ENTRADA"
      ? calculateEntryState(hora, horario?.horaEntrada, horario?.toleranciaMin ?? Number(config.toleranciaGlobal || 10))
      : calculateExitState(hora, horario?.horaSalida);

  const userAgent = request.headers.get("user-agent") ?? "";
  try {
    const mark = await prisma.marcacion.create({
      data: {
        trabajadorId: worker.id, fecha, horaMarcada: hora, tipo, ...state, ip, userAgent,
        latitud: config.geofenceEnabled === "true" ? parsed.data.latitud : undefined,
        longitud: config.geofenceEnabled === "true" ? parsed.data.longitud : undefined
      }
    });
    return NextResponse.json({
      trabajador: { dni: worker.dni, apellidosNombres: worker.apellidosNombres, nivel: worker.nivel, cargo: worker.cargo },
      tipo: mark.tipo, horaMarcada: mark.horaMarcada, estado: mark.estado, minutosTardanza: mark.minutosTardanza,
      avisoHorario: hasSchedule ? undefined : "Hoy no tienes horario asignado."
    });
  } catch (error) {
    const duplicate = await prisma.marcacion.findFirst({ where: { trabajadorId: worker.id, fecha, tipo } });
    if (duplicate) return NextResponse.json({ error: "La marcación ya fue registrada. Actualiza la página para verificar." }, { status: 409 });
    throw error;
  }
}
