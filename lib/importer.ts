import ExcelJS from "exceljs";
import { z } from "zod";

const employeeSchema = z.object({
  dni: z.string().regex(/^\d{8}$/),
  apellidosNombres: z.string().min(3).max(160),
  nivel: z.enum(["INICIAL", "PRIMARIA", "SECUNDARIA", "CETPRO"]),
  cargo: z.string().min(1).max(120),
  condicion: z.string().max(80).default(""),
  horasSemanales: z.number().int().min(0).max(80).default(0)
});

export type ImportEmployee = z.infer<typeof employeeSchema>;
export type ImportSchedule = { dni: string; diaSemana: number; horaEntrada: string | null; horaSalida: string | null; toleranciaMin: number };
export type ImportHoliday = { fecha: string; descripcion: string };
export type ImportJustification = { dni: string; fechaInicio: string; fechaFin: string; motivo: string; observacion: string };
export type WorkbookImport = {
  employees: ImportEmployee[];
  schedules: ImportSchedule[];
  holidays: ImportHoliday[];
  justifications: ImportJustification[];
  errors: string[];
};

const DAY_NAMES: Record<string, number> = {
  lunes: 1, lun: 1, martes: 2, mar: 2, miercoles: 3, mie: 3, jueves: 4, jue: 4, viernes: 5, vie: 5
};

function normalizeDni(value: unknown) {
  const text = String(value ?? "").trim();
  return /^\d{1,8}$/.test(text) ? text.padStart(8, "0") : text;
}

function normalized(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function timeValue(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object" && "result" in value) return value.result == null ? null : timeValue(value.result);
  if (value instanceof Date) return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
  if (typeof value === "number") {
    const total = Math.round((value % 1) * 1440);
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
  const text = String(value).trim();
  const match = text.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function dateValue(value: ExcelJS.CellValue): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }
  const text = String(value ?? "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return dmy ? `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}` : null;
}

function headerIndexes(row: ExcelJS.Row) {
  const indexes = new Map<string, number>();
  row.eachCell({ includeEmpty: false }, (cell, column) => indexes.set(normalized(cell.text || cell.value), column));
  return indexes;
}

function cellByHeader(row: ExcelJS.Row, indexes: Map<string, number>, ...names: string[]) {
  for (const name of names) {
    const column = indexes.get(normalized(name));
    if (column) return row.getCell(column).value;
  }
  return null;
}

export async function parseInstitutionWorkbook(buffer: Uint8Array): Promise<WorkbookImport> {
  const workbook = new ExcelJS.Workbook();
  const excelBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(excelBuffer).set(buffer);
  await workbook.xlsx.load(excelBuffer);
  const errors: string[] = [];
  const employees: ImportEmployee[] = [];
  const schedules = new Map<string, ImportSchedule>();
  const holidays: ImportHoliday[] = [];
  const justifications: ImportJustification[] = [];
  const employeeSheet = workbook.getWorksheet("Docentes");

  if (employeeSheet) {
    const indexes = headerIndexes(employeeSheet.getRow(1));
    for (let rowNumber = 2; rowNumber <= employeeSheet.rowCount; rowNumber++) {
      const row = employeeSheet.getRow(rowNumber);
      const dni = normalizeDni(cellByHeader(row, indexes, "DNI"));
      if (!dni) continue;
      const candidate = {
        dni,
        apellidosNombres: String(cellByHeader(row, indexes, "Apellidos y Nombres") ?? "").trim(),
        nivel: normalized(cellByHeader(row, indexes, "Nivel")).toUpperCase(),
        cargo: String(cellByHeader(row, indexes, "Cargo") ?? "").trim(),
        condicion: String(cellByHeader(row, indexes, "Condición", "Condicion") ?? "").trim(),
        horasSemanales: Number(cellByHeader(row, indexes, "Horas Semanales") ?? 0)
      };
      const parsed = employeeSchema.safeParse(candidate);
      if (parsed.success) employees.push(parsed.data);
      else errors.push(`Docentes, fila ${rowNumber}: datos incompletos o inválidos.`);
    }
  }

  const scheduleSheet = workbook.getWorksheet("Horarios");
  if (scheduleSheet) {
    const indexes = headerIndexes(scheduleSheet.getRow(1));
    const dniColumn = indexes.get("dni") ?? 2;
    const toleranceColumn = [...indexes.entries()].find(([key]) => key.includes("tolerancia"))?.[1] ?? 8;
    const prefixes = ["lun", "mar", "mie", "jue", "vie"];
    const detailedColumns = [1, 2, 3, 4, 5].map((day) => {
      const prefix = prefixes[day - 1];
      const entryColumn = indexes.get(`${prefix} entrada`);
      const exitColumn = indexes.get(`${prefix} salida`);
      return entryColumn && exitColumn ? { day, entryColumn, exitColumn } : null;
    }).filter((value): value is { day: number; entryColumn: number; exitColumn: number } => value !== null);
    const uniformColumns = detailedColumns.length === 0;
    for (let rowNumber = 2; rowNumber <= scheduleSheet.rowCount; rowNumber++) {
      const row = scheduleSheet.getRow(rowNumber);
      const dni = normalizeDni(row.getCell(dniColumn).value);
      if (!/^\d{8}$/.test(dni)) continue;
      const tolerance = Number(row.getCell(toleranceColumn).value ?? 10);
      if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 120) {
        errors.push(`Horarios, fila ${rowNumber}: revise las horas o la tolerancia.`);
        continue;
      }
      const columns = uniformColumns
        ? Array.from({ length: 5 }, (_, index) => ({ day: index + 1, entryColumn: 6, exitColumn: 7 }))
        : detailedColumns;
      for (const { day, entryColumn, exitColumn } of columns) {
        const entryRaw = row.getCell(entryColumn).value;
        const exitRaw = row.getCell(exitColumn).value;
        const entrance = timeValue(entryRaw);
        const exit = timeValue(exitRaw);
        if ((entryRaw && !entrance) || (exitRaw && !exit) || (entrance && !exit) || (!entrance && exit) || (entrance && exit && exit <= entrance)) {
          errors.push(`Horarios, fila ${rowNumber}: revise las horas del día ${day}.`);
          continue;
        }
        schedules.set(`${dni}|${day}`, { dni, diaSemana: day, horaEntrada: entrance, horaSalida: exit, toleranciaMin: tolerance });
      }
    }
  }

  const periodSheet = workbook.getWorksheet("Horario_Periodos");
  if (periodSheet) {
    for (let rowNumber = 1; rowNumber <= periodSheet.rowCount; rowNumber++) {
      const title = String(periodSheet.getRow(rowNumber).getCell(1).text || "");
      const dni = title.match(/\bDNI\s*:\s*(\d{1,8})\b/i)?.[1];
      if (!dni) continue;
      const normalizedWorkerDni = normalizeDni(dni);
      const dayRow = periodSheet.getRow(rowNumber + 1);
      const entryRow = periodSheet.getRow(rowNumber + 2);
      const exitRow = periodSheet.getRow(rowNumber + 3);
      for (let column = 3; column <= 7; column++) {
        const day = DAY_NAMES[normalized(dayRow.getCell(column).text || dayRow.getCell(column).value)];
        if (!day) continue;
        const entryRaw = entryRow.getCell(column).value;
        const exitRaw = exitRow.getCell(column).value;
        const entry = timeValue(entryRaw);
        const exit = timeValue(exitRaw);
        if ((entryRaw && !entry) || (exitRaw && !exit) || (entry && !exit) || (!entry && exit) || (entry && exit && exit <= entry)) {
          errors.push(`Horario_Periodos, fila ${rowNumber + 2}: revise las horas del día.`);
          continue;
        }
        schedules.set(`${normalizedWorkerDni}|${day}`, { dni: normalizedWorkerDni, diaSemana: day, horaEntrada: entry, horaSalida: exit, toleranciaMin: 10 });
      }
      rowNumber += 3;
    }
  }

  const holidaySheet = workbook.getWorksheet("Feriados");
  if (holidaySheet) {
    const indexes = headerIndexes(holidaySheet.getRow(1));
    for (let rowNumber = 2; rowNumber <= holidaySheet.rowCount; rowNumber++) {
      const row = holidaySheet.getRow(rowNumber);
      const rawDate = cellByHeader(row, indexes, "Fecha");
      const description = String(cellByHeader(row, indexes, "Motivo", "Descripción", "Descripcion") ?? "").trim();
      if (!rawDate || !description) continue;
      const fecha = dateValue(rawDate);
      if (fecha) holidays.push({ fecha, descripcion: description });
      else errors.push(`Feriados, fila ${rowNumber}: fecha inválida.`);
    }
  }

  const justificationSheet = workbook.getWorksheet("Justificaciones");
  if (justificationSheet) {
    const indexes = headerIndexes(justificationSheet.getRow(1));
    for (let rowNumber = 2; rowNumber <= justificationSheet.rowCount; rowNumber++) {
      const row = justificationSheet.getRow(rowNumber);
      const dni = normalizeDni(cellByHeader(row, indexes, "DNI"));
      const rawDate = cellByHeader(row, indexes, "Fecha");
      if (!dni || !rawDate) continue;
      const fecha = dateValue(rawDate);
      const motivo = String(cellByHeader(row, indexes, "Motivo de Justificación", "Motivo") ?? "").trim();
      const observacion = String(cellByHeader(row, indexes, "Documento Sustentatorio", "Observación", "Observacion") ?? "").trim();
      if (!/^\d{8}$/.test(dni) || !fecha || !motivo) errors.push(`Justificaciones, fila ${rowNumber}: DNI, fecha o motivo inválido.`);
      else justifications.push({ dni, fechaInicio: fecha, fechaFin: fecha, motivo, observacion });
    }
  }

  if (!employeeSheet && !scheduleSheet && !periodSheet) {
    errors.push("El archivo no contiene hojas Docentes, Horarios ni Horario_Periodos reconocibles.");
  }
  const employeeDnis = new Set(employees.map((employee) => employee.dni));
  for (const schedule of schedules.values()) {
    if (!employeeDnis.has(schedule.dni)) errors.push(`El horario con DNI ${schedule.dni} no tiene trabajador correspondiente en Docentes.`);
  }
  for (const justification of justifications) {
    if (!employeeDnis.has(justification.dni)) errors.push(`Una justificación del DNI ${justification.dni} no tiene trabajador correspondiente en Docentes.`);
  }
  return { employees, schedules: [...schedules.values()], holidays, justifications, errors };
}
