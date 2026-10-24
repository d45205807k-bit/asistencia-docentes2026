import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.configuracion.findMany({
    where: { clave: { in: ["geofenceEnabled", "nombreIE"] } }
  });
  const config = Object.fromEntries(settings.map((item) => [item.clave, item.valor]));
  return NextResponse.json({
    geofenceEnabled: config.geofenceEnabled === "true",
    nombreIE: config.nombreIE ?? 'I.E. "Ricardo Palma"',
    timestampServidor: Date.now()
  });
}
