import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "I.E. Ricardo Palma";
  const staff = workbook.addWorksheet("Docentes");
  staff.addRow(["DNI", "Apellidos y Nombres", "Nivel", "Cargo", "Condición", "Horas Semanales"]);
  staff.addRow(["99999991", "Ejemplo Apellidos Nombres", "INICIAL", "DOCENTE", "CONTRATADO", 30]);
  staff.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  staff.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF17445F" } };
  const schedules = workbook.addWorksheet("Horarios");
  schedules.addRow([
    "DNI", "Apellidos y Nombres", "Nivel", "Cargo", "Lun Entrada", "Lun Salida",
    "Mar Entrada", "Mar Salida", "Mié Entrada", "Mié Salida", "Jue Entrada", "Jue Salida",
    "Vie Entrada", "Vie Salida", "Tolerancia"
  ]);
  schedules.addRow(["99999991", "Ejemplo Apellidos Nombres", "INICIAL", "DOCENTE", "13:00", "18:00", "13:00", "18:00", "13:00", "18:00", "13:00", "18:00", "13:45", "17:45", 10]);
  schedules.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  schedules.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF17445F" } };
  schedules.views = [{ state: "frozen", ySplit: 1 }];
  schedules.columns = [{ width: 12 }, { width: 30 }, { width: 16 }, { width: 22 }, ...Array.from({ length: 10 }, () => ({ width: 16 }))];
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  await prisma.auditLog.create({ data: { accion: "DESCARGA_PLANTILLA_HORARIO", detalle: "Plantilla para importar personal y horarios.", ip } });
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Plantilla_Personal_Horarios.xlsx"'
    }
  });
}
