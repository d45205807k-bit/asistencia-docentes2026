import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseInstitutionWorkbook } from "../lib/importer";

async function workbookBuffer(workbook: ExcelJS.Workbook) {
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

describe("importación del formato institucional", () => {
  it("lee la plantilla con horario distinto para cada día de la semana", async () => {
    const workbook = new ExcelJS.Workbook();
    const staff = workbook.addWorksheet("Docentes");
    staff.addRow(["DNI", "Apellidos y Nombres", "Nivel", "Cargo", "Condición", "Horas Semanales"]);
    staff.addRow(["12345678", "Trabajador de Prueba", "SECUNDARIA", "DOCENTE", "CONTRATADO", 30]);
    const schedules = workbook.addWorksheet("Horarios");
    schedules.addRow(["DNI", "Apellidos y Nombres", "Nivel", "Cargo", "Lun Entrada", "Lun Salida", "Mar Entrada", "Mar Salida", "Mié Entrada", "Mié Salida", "Jue Entrada", "Jue Salida", "Vie Entrada", "Vie Salida", "Tolerancia"]);
    schedules.addRow(["12345678", "Trabajador de Prueba", "SECUNDARIA", "DOCENTE", "08:00", "15:00", "08:00", "15:00", "08:00", "15:00", "16:15", "19:15", "13:45", "17:45", 10]);

    const result = await parseInstitutionWorkbook(await workbookBuffer(workbook));
    expect(result.errors).toEqual([]);
    expect(result.employees).toHaveLength(1);
    expect(result.schedules.find((schedule) => schedule.diaSemana === 4)).toMatchObject({ horaEntrada: "16:15", horaSalida: "19:15" });
    expect(result.schedules.find((schedule) => schedule.diaSemana === 5)).toMatchObject({ horaEntrada: "13:45", horaSalida: "17:45" });
  });

  it("reporta errores de salida anterior a la entrada", async () => {
    const workbook = new ExcelJS.Workbook();
    const staff = workbook.addWorksheet("Docentes");
    staff.addRow(["DNI", "Apellidos y Nombres", "Nivel", "Cargo", "Condición", "Horas Semanales"]);
    staff.addRow(["12345678", "Trabajador de Prueba", "SECUNDARIA", "DOCENTE", "CONTRATADO", 30]);
    const schedules = workbook.addWorksheet("Horarios");
    schedules.addRow(["DNI", "Apellidos y Nombres", "Nivel", "Cargo", "Lun Entrada", "Lun Salida", "Mar Entrada", "Mar Salida", "Mié Entrada", "Mié Salida", "Jue Entrada", "Jue Salida", "Vie Entrada", "Vie Salida", "Tolerancia"]);
    schedules.addRow(["12345678", "Trabajador de Prueba", "SECUNDARIA", "DOCENTE", "16:00", "15:00", "", "", "", "", "", "", "", "", 10]);
    const result = await parseInstitutionWorkbook(await workbookBuffer(workbook));
    expect(result.errors).toContain("Horarios, fila 2: revise las horas del día 1.");
  });
});
