import { describe, expect, it } from "vitest";
import { attendanceCode, calculateEntryState, calculateExitState, nextMarkType } from "../lib/asistencia";

describe("reglas de asistencia", () => {
  it("considera puntual la marca dentro de tolerancia", () => {
    expect(calculateEntryState("08:10:00", "08:00", 10)).toEqual({ estado: "PUNTUAL", minutosTardanza: 0 });
  });

  it("calcula la tardanza desde la hora de entrada", () => {
    expect(calculateEntryState("08:11:00", "08:00", 10)).toEqual({ estado: "TARDANZA", minutosTardanza: 11 });
  });

  it("detecta salida anticipada", () => {
    expect(calculateExitState("17:30:00", "18:00")).toEqual({ estado: "SALIDA_ANTICIPADA", minutosTardanza: 30 });
  });

  it("determina entrada, salida y bloqueo después de completar el día", () => {
    const now = new Date("2026-10-23T20:00:00Z");
    expect(nextMarkType([], now)).toEqual({ tipo: "ENTRADA" });
    expect(nextMarkType([{ tipo: "ENTRADA", creadoEn: new Date("2026-10-23T19:50:00Z") }], now)).toEqual({ tipo: "SALIDA" });
    expect(nextMarkType([
      { tipo: "ENTRADA", creadoEn: new Date("2026-10-23T19:00:00Z") },
      { tipo: "SALIDA", creadoEn: new Date("2026-10-23T20:00:00Z") }
    ], new Date("2026-10-23T20:03:00Z"))).toEqual({ error: "COMPLETA" });
  });

  it("rechaza un clic repetido dentro de dos minutos", () => {
    expect(nextMarkType([
      { tipo: "ENTRADA", creadoEn: new Date("2026-10-23T19:59:00Z") }
    ], new Date("2026-10-23T20:00:00Z"))).toEqual({ error: "DUPLICADA" });
  });

  it("usa tolerancias y horarios independientes según cada día", () => {
    const thursday = calculateEntryState("16:26:00", "16:15", 10);
    const friday = calculateEntryState("13:50:00", "13:45", 10);
    expect(thursday).toEqual({ estado: "TARDANZA", minutosTardanza: 11 });
    expect(friday).toEqual({ estado: "PUNTUAL", minutosTardanza: 0 });
  });

  it.each([
    [{ isHoliday: true, hasSchedule: true, justified: false, hasEntry: false, hasExit: false }, "FER"],
    [{ isHoliday: false, hasSchedule: false, justified: false, hasEntry: false, hasExit: false }, "-"],
    [{ isHoliday: false, hasSchedule: true, justified: true, hasEntry: false, hasExit: false }, "J"],
    [{ isHoliday: false, hasSchedule: true, justified: false, hasEntry: false, hasExit: false }, "F"],
    [{ isHoliday: false, hasSchedule: true, justified: false, hasEntry: true, hasExit: false }, "F"],
    [{ isHoliday: false, hasSchedule: true, justified: false, entryState: "TARDANZA", hasEntry: true, hasExit: true }, "T"],
    [{ isHoliday: false, hasSchedule: true, justified: false, entryState: "PUNTUAL", hasEntry: true, hasExit: true }, "A"]
  ] as const)("asigna el código según calendario y marcaciones", (input, expected) => {
    expect(attendanceCode(input)).toBe(expected);
  });
});
