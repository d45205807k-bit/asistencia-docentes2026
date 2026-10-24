import { NextResponse } from "next/server";
import { z } from "zod";
import { monthlyWorkbook } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { limaDateTime } from "@/lib/time";

export async function GET(request: Request) {
  const lima = limaDateTime();
  const querySchema = z.object({
    year: z.coerce.number().int().min(2000).max(2100).default(Number(lima.fecha.slice(0, 4))),
    month: z.coerce.number().int().min(1).max(12).default(Number(lima.fecha.slice(5, 7)))
  });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Mes o año inválido." }, { status: 400 });
  const { year, month } = parsed.data;
  const workbook = await monthlyWorkbook(year, month);
  const buffer = await workbook.xlsx.writeBuffer();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  await prisma.auditLog.create({ data: { accion: "DESCARGA_MENSUAL", detalle: `${year}-${String(month).padStart(2, "0")}`, ip } });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Asistencia_Mensual_${year}-${String(month).padStart(2, "0")}.xlsx"`
    }
  });
}
