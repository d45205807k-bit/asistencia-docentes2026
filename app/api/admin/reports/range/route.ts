import { NextResponse } from "next/server";
import { z } from "zod";
import { rangeWorkbook } from "@/lib/reports";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  workerId: z.string().max(30).optional()
}).superRefine((value, context) => {
  const start = new Date(`${value.from}T00:00:00Z`).getTime();
  const end = new Date(`${value.to}T00:00:00Z`).getTime();
  const days = (end - start) / 86_400_000;
  if (days < 0 || days >= 92) context.addIssue({ code: "custom", message: "El intervalo debe ser de hasta 92 días." });
});

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Verifique el intervalo (máximo 92 días)." }, { status: 400 });
  const { from, to, workerId } = parsed.data;
  if (workerId && !await prisma.trabajador.findUnique({ where: { id: workerId }, select: { id: true } })) {
    return NextResponse.json({ error: "No se encontró al trabajador." }, { status: 404 });
  }
  const workbook = await rangeWorkbook(from, to, workerId);
  const buffer = await workbook.xlsx.writeBuffer();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  await prisma.auditLog.create({ data: { accion: "DESCARGA_RANGO", detalle: `${from} a ${to}; trabajador: ${workerId ?? "todos"}`, ip } });
  const suffix = workerId ? `_Trabajador_${workerId}` : "";
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Asistencia_${from}_${to}${suffix}.xlsx"`
    }
  });
}