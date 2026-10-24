import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySameOrigin } from "@/lib/validation";

const schema = z.object({
  nombreIE: z.string().trim().min(2).max(120),
  toleranciaGlobal: z.coerce.number().int().min(0).max(120),
  geofenceEnabled: z.boolean(),
  geofenceLat: z.number().min(-90).max(90).nullable(),
  geofenceLng: z.number().min(-180).max(180).nullable(),
  geofenceRadius: z.number().int().min(10).max(10000),
  nuevaPassword: z.string().max(200).optional()
}).refine((value) => !value.geofenceEnabled || (value.geofenceLat !== null && value.geofenceLng !== null), {
  message: "Ingrese las coordenadas del colegio para activar la geovalla."
}).refine((value) => !value.nuevaPassword || value.nuevaPassword.length >= 12, {
  message: "La nueva contraseña debe tener al menos 12 caracteres."
});

export async function GET() {
  const settings = await prisma.configuracion.findMany({
    where: { clave: { in: ["nombreIE", "toleranciaGlobal", "geofenceEnabled", "geofenceLat", "geofenceLng", "geofenceRadius"] } }
  });
  return NextResponse.json(Object.fromEntries(settings.map((item) => [item.clave, item.valor])));
}

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const input = await request.json().catch(() => null);
  const parsed = schema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revise los datos." }, { status: 400 });
  const values = parsed.data;
  const settings: Record<string, string> = {
    nombreIE: values.nombreIE,
    toleranciaGlobal: String(values.toleranciaGlobal),
    geofenceEnabled: String(values.geofenceEnabled),
    geofenceRadius: String(values.geofenceRadius)
  };
  if (values.geofenceLat !== null) settings.geofenceLat = String(values.geofenceLat);
  if (values.geofenceLng !== null) settings.geofenceLng = String(values.geofenceLng);
  await prisma.$transaction(async (tx) => {
    for (const [clave, valor] of Object.entries(settings)) {
      await tx.configuracion.upsert({ where: { clave }, update: { valor }, create: { clave, valor } });
    }
    if (values.nuevaPassword) {
      const valor = await bcrypt.hash(values.nuevaPassword, 12);
      await tx.configuracion.upsert({
        where: { clave: "adminPasswordHash" }, update: { valor }, create: { clave: "adminPasswordHash", valor }
      });
    }
    await tx.auditLog.create({
      data: {
        accion: values.nuevaPassword ? "CAMBIO_CONFIGURACION_Y_CLAVE" : "CAMBIO_CONFIGURACION",
        detalle: values.nuevaPassword ? "Configuración general y contraseña actualizadas." : "Configuración general actualizada.",
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
      }
    });
  });
  return NextResponse.json({ ok: true });
}
