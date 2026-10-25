import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { attendanceCode } from "@/lib/asistencia";

const navy = "17445F";
const palette: Record<string, string> = {
  A: "D9EAD3", T: "FCE5CD", F: "F4CCCC", J: "CFE2F3", FER: "D9E1F2", "-": "F3F4F6"
};
const weekdayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type AttendanceMarkRow = {
  fecha: string;
  tipo: string;
  horaMarcada: string;
  estado: string;
  minutosTardanza: number;
  trabajador: { dni: string; apellidosNombres: string; nivel: string };
};

function styleSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.pageSetup = { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  sheet.getRow(1).font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${navy}` } };
  sheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(1).height = 30;
  sheet.columns.forEach((column) => {
    let max = 10;
    column.eachCell?.({ includeEmpty: false }, (cell) => { max = Math.max(max, String(cell.value ?? "").length); });
    column.width = Math.min(Math.max(max + 2, 12), 36);
  });
}

function highlightDayStart(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2F0E9" } };
    cell.font = { ...cell.font, bold: true };
    cell.border = { ...cell.border, top: { style: "medium", color: { argb: `FF${navy}` } } };
  });
}

function addChronologicalMarks(sheet: ExcelJS.Worksheet, marks: AttendanceMarkRow[]) {
  sheet.addRow(["Fecha", "Día", "DNI", "Apellidos y Nombres", "Nivel", "Tipo", "Hora", "Estado", "Minutos"]);
  let previousDate = "";
  for (const mark of marks) {
    const weekday = new Date(`${mark.fecha}T12:00:00Z`).getUTCDay();
    const row = sheet.addRow([
      mark.fecha, weekdayNames[weekday], mark.trabajador.dni, mark.trabajador.apellidosNombres,
      mark.trabajador.nivel, mark.tipo, mark.horaMarcada, mark.estado, mark.minutosTardanza
    ]);
    if (mark.fecha !== previousDate) highlightDayStart(row);
    previousDate = mark.fecha;
  }
  styleSheet(sheet);
  sheet.autoFilter = { from: "A1", to: `I${Math.max(1, sheet.rowCount)}` };
}

function dateRange(year: number, month: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return { day, date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, weekday };
  });
}

export async function dailyWorkbook(fecha: string, nivel?: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "I.E. Ricardo Palma";
  workbook.modified = new Date();
  const marks = await prisma.marcacion.findMany({
    where: { fecha },
    include: { trabajador: { select: { dni: true, apellidosNombres: true, nivel: true } } },
    orderBy: [{ horaMarcada: "asc" }, { creadoEn: "asc" }]
  });
  const filteredMarks = nivel ? marks.filter((mark) => mark.trabajador.nivel === nivel) : marks;
  const sheet = workbook.addWorksheet("Marcaciones del día");
  addChronologicalMarks(sheet, filteredMarks);
  return workbook;
}

export async function rangeWorkbook(from: string, to: string, workerId?: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "I.E. Ricardo Palma";
  const marks = await prisma.marcacion.findMany({
    where: { fecha: { gte: from, lte: to }, ...(workerId ? { trabajadorId: workerId } : {}) },
    include: { trabajador: { select: { dni: true, apellidosNombres: true, nivel: true } } },
    orderBy: [{ fecha: "asc" }, { horaMarcada: "asc" }, { creadoEn: "asc" }]
  });
  const sheet = workbook.addWorksheet("Marcaciones por período");
  addChronologicalMarks(sheet, marks);
  return workbook;
}

export async function monthlyWorkbook(year: number, month: number) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "I.E. Ricardo Palma";
  const days = dateRange(year, month);
  const validDays = days.filter(({ weekday }) => weekday >= 1 && weekday <= 5);
  const workers = await prisma.trabajador.findMany({
    where: { activo: true }, include: { horarios: true }, orderBy: { apellidosNombres: "asc" }
  });
  const dateStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const dateEnd = `${year}-${String(month).padStart(2, "0")}-${String(days.length).padStart(2, "0")}`;
  const [marks, holidays, justifications] = await Promise.all([
    prisma.marcacion.findMany({
      where: { fecha: { gte: dateStart, lte: dateEnd } },
      include: { trabajador: { select: { dni: true, apellidosNombres: true, nivel: true } } }
    }),
    prisma.feriado.findMany({ where: { fecha: { gte: dateStart, lte: dateEnd } } }),
    prisma.justificacion.findMany({ where: { fechaInicio: { lte: dateEnd }, fechaFin: { gte: dateStart } } })
  ]);
  const markMap = new Map(marks.map((mark) => [`${mark.trabajadorId}|${mark.fecha}|${mark.tipo}`, mark]));
  const holidaySet = new Set(holidays.map((holiday) => holiday.fecha));
  const monthly = workbook.addWorksheet("Consolidado");
  const minutesSheet = workbook.addWorksheet("Minutos");
  const baseHeaders = ["N°", "DNI", "Apellidos y Nombres", "Nivel"];
  const headers = [...baseHeaders, ...validDays.map((date) => String(date.day)), "Total asistencias", "Total tardanzas", "Total minutos de tardanza", "Total faltas", "Total justificadas"];
  monthly.addRow(headers);
  minutesSheet.addRow(["N°", "DNI", "Apellidos y Nombres", ...validDays.map((date) => String(date.day))]);

  for (const [index, worker] of workers.entries()) {
    const codes: string[] = [];
    const minutes: number[] = [];
    for (const { date, weekday } of validDays) {
      const entry = markMap.get(`${worker.id}|${date}|ENTRADA`);
      const exit = markMap.get(`${worker.id}|${date}|SALIDA`);
      const schedule = worker.horarios.find((item) => item.diaSemana === weekday);
      const justified = justifications.some((item) => item.trabajadorId === worker.id && item.fechaInicio <= date && item.fechaFin >= date);
      const code = attendanceCode({
        isHoliday: holidaySet.has(date), hasSchedule: Boolean(schedule?.horaEntrada && schedule.horaSalida),
        justified, entryState: entry?.estado, hasEntry: Boolean(entry), hasExit: Boolean(exit)
      });
      codes.push(code);
      minutes.push(code === "T" ? (entry?.minutosTardanza ?? 0) : 0);
    }
    const row = monthly.addRow([index + 1, worker.dni, worker.apellidosNombres, worker.nivel, ...codes]);
    for (let dayIndex = 0; dayIndex < codes.length; dayIndex++) {
      const cell = row.getCell(5 + dayIndex);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${palette[codes[dayIndex]]}` } };
      cell.alignment = { horizontal: "center" };
    }
    const firstDayColumn = 5;
    const lastDayColumn = firstDayColumn + codes.length - 1;
    const firstDayLetter = monthly.getColumn(firstDayColumn).letter;
    const lastDayLetter = monthly.getColumn(lastDayColumn).letter;
    const totals = [
      { formula: `COUNTIF(${firstDayLetter}${row.number}:${lastDayLetter}${row.number},"A")+COUNTIF(${firstDayLetter}${row.number}:${lastDayLetter}${row.number},"T")` },
      { formula: `COUNTIF(${firstDayLetter}${row.number}:${lastDayLetter}${row.number},"T")` },
      { formula: `SUM(Minutos!D${index + 2}:${minutesSheet.getColumn(3 + minutes.length).letter}${index + 2})` },
      { formula: `COUNTIF(${firstDayLetter}${row.number}:${lastDayLetter}${row.number},"F")` },
      { formula: `COUNTIF(${firstDayLetter}${row.number}:${lastDayLetter}${row.number},"J")` }
    ];
    totals.forEach((value, offset) => row.getCell(lastDayColumn + 1 + offset).value = value);
    minutesSheet.addRow([index + 1, worker.dni, worker.apellidosNombres, ...minutes]);
  }
  minutesSheet.state = "hidden";
  styleSheet(monthly);
  styleSheet(minutesSheet);
  monthly.views = [{ state: "frozen", xSplit: 4, ySplit: 1 }];
  monthly.autoFilter = { from: "A1", to: `${monthly.getColumn(monthly.columnCount).letter}1` };

  const detail = workbook.addWorksheet("Detalle de marcaciones");
  const chronologicalMarks = [...marks].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaMarcada.localeCompare(b.horaMarcada) || a.creadoEn.getTime() - b.creadoEn.getTime());
  addChronologicalMarks(detail, chronologicalMarks);

  const summary = workbook.addWorksheet("Resumen por nivel");
  summary.addRow(["Nivel", "Total trabajadores", "Asistencias", "Tardanzas", "Faltas", "Justificadas"]);
  const levels = [...new Set(workers.map((worker) => worker.nivel))].sort();
  const levelColumn = monthly.getColumn(4).letter;
  const dataEnd = workers.length + 1;
  for (const [index, level] of levels.entries()) {
    const rowNumber = index + 2;
    const lastLetter = monthly.getColumn(monthly.columnCount).letter;
    const totalsStart = monthly.getColumn(monthly.columnCount - 4).letter;
    summary.addRow([
      level,
      { formula: `COUNTIF(Consolidado!${levelColumn}2:${levelColumn}${dataEnd},A${rowNumber})` },
      { formula: `SUMIF(Consolidado!${levelColumn}2:${levelColumn}${dataEnd},A${rowNumber},Consolidado!${totalsStart}2:${totalsStart}${dataEnd})` },
      { formula: `SUMIF(Consolidado!${levelColumn}2:${levelColumn}${dataEnd},A${rowNumber},Consolidado!${monthly.getColumn(monthly.columnCount - 3).letter}2:${monthly.getColumn(monthly.columnCount - 3).letter}${dataEnd})` },
      { formula: `SUMIF(Consolidado!${levelColumn}2:${levelColumn}${dataEnd},A${rowNumber},Consolidado!${monthly.getColumn(monthly.columnCount - 1).letter}2:${monthly.getColumn(monthly.columnCount - 1).letter}${dataEnd})` },
      { formula: `SUMIF(Consolidado!${levelColumn}2:${levelColumn}${dataEnd},A${rowNumber},Consolidado!${lastLetter}2:${lastLetter}${dataEnd})` }
    ]);
  }
  styleSheet(summary);
  return workbook;
}
