import { NextResponse } from "next/server";
import { z } from "zod";
import { dailyWorkbook } from "@/lib/reports";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nivel: z.string().max(40).optional()
});

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  const workbook = await dailyWorkbook(parsed.data.date, parsed.data.nivel);
  const buffer = await workbook.xlsx.writeBuffer();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  await prisma.auditLog.create({ data: { accion: "DESCARGA_DIARIA", detalle: parsed.data.date, ip } });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Asistencia_Diaria_${parsed.data.date}.xlsx"`
    }
  });
}
