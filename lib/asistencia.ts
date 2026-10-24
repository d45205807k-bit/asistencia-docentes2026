export type EstadoMarca =
  | "PUNTUAL"
  | "TARDANZA"
  | "SALIDA_ANTICIPADA"
  | "SALIDA_NORMAL"
  | "SIN_HORARIO";

export function nextMarkType(
  marks: Array<{ tipo: string; creadoEn: Date }>,
  now: Date,
  duplicateWindowMs = 120_000
): { tipo?: "ENTRADA" | "SALIDA"; error?: "DUPLICADA" | "COMPLETA" } {
  const latest = marks.reduce<typeof marks[number] | undefined>(
    (current, mark) => !current || mark.creadoEn > current.creadoEn ? mark : current,
    undefined
  );
  if (latest && now.getTime() - latest.creadoEn.getTime() < duplicateWindowMs) return { error: "DUPLICADA" };
  const hasEntry = marks.some((mark) => mark.tipo === "ENTRADA");
  const hasExit = marks.some((mark) => mark.tipo === "SALIDA");
  if (hasEntry && hasExit) return { error: "COMPLETA" };
  return { tipo: hasEntry ? "SALIDA" : "ENTRADA" };
}

export function calculateEntryState(
  horaMarcada: string,
  horaEntrada: string | null | undefined,
  toleranciaMin = 10
): { estado: EstadoMarca; minutosTardanza: number } {
  if (!horaEntrada) return { estado: "SIN_HORARIO", minutosTardanza: 0 };
  const marked = toSeconds(horaMarcada);
  const scheduled = toSeconds(horaEntrada);
  if (marked > scheduled + toleranciaMin * 60) {
    return { estado: "TARDANZA", minutosTardanza: Math.floor((marked - scheduled) / 60) };
  }
  return { estado: "PUNTUAL", minutosTardanza: 0 };
}

export function calculateExitState(
  horaMarcada: string,
  horaSalida: string | null | undefined
): { estado: EstadoMarca; minutosTardanza: number } {
  if (!horaSalida) return { estado: "SIN_HORARIO", minutosTardanza: 0 };
  const seconds = Math.max(0, toSeconds(horaSalida) - toSeconds(horaMarcada));
  return seconds > 0
    ? { estado: "SALIDA_ANTICIPADA", minutosTardanza: Math.ceil(seconds / 60) }
    : { estado: "SALIDA_NORMAL", minutosTardanza: 0 };
}

export function attendanceCode(input: {
  isHoliday: boolean;
  hasSchedule: boolean;
  justified: boolean;
  entryState?: string;
  hasEntry: boolean;
  hasExit: boolean;
}) {
  if (input.isHoliday) return "FER";
  if (!input.hasSchedule) return "-";
  if (input.justified) return "J";
  if (!input.hasEntry || !input.hasExit) return "F";
  return input.entryState === "TARDANZA" ? "T" : "A";
}

export function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function toSeconds(value: string) {
  const [hours, minutes, seconds = 0] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}
