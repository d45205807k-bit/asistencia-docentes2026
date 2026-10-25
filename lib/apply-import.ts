import { prisma } from "@/lib/prisma";
import type { WorkbookImport } from "@/lib/importer";

export async function applyWorkbookImport(parsed: WorkbookImport, ip = "") {
  await prisma.$transaction(async (tx) => {
    const employeeIds = new Map<string, string>();
    for (const employee of parsed.employees) {
      const record = await tx.trabajador.upsert({
        where: { dni: employee.dni },
        update: {
          apellidosNombres: employee.apellidosNombres, nivel: employee.nivel, cargo: employee.cargo,
          condicion: employee.condicion, horasSemanales: employee.horasSemanales, activo: true
        },
        create: { ...employee }
      });
      employeeIds.set(employee.dni, record.id);
    }
    const schedulesByWorker = new Map<string, typeof parsed.schedules>();
    for (const schedule of parsed.schedules) {
      const workerId = employeeIds.get(schedule.dni);
      if (!workerId) continue;
      const current = schedulesByWorker.get(workerId) ?? [];
      current.push(schedule);
      schedulesByWorker.set(workerId, current);
    }
    for (const [workerId, schedules] of schedulesByWorker) {
      await tx.horario.deleteMany({ where: { trabajadorId: workerId } });
      await tx.horario.createMany({
        data: schedules.map((schedule) => ({
          trabajadorId: workerId, diaSemana: schedule.diaSemana, horaEntrada: schedule.horaEntrada,
          horaSalida: schedule.horaSalida, toleranciaMin: schedule.toleranciaMin
        }))
      });
    }
    for (const holiday of parsed.holidays) {
      await tx.feriado.upsert({ where: { fecha: holiday.fecha }, update: { descripcion: holiday.descripcion }, create: holiday });
    }
    for (const justification of parsed.justifications) {
      const trabajadorId = employeeIds.get(justification.dni);
      if (trabajadorId) {
        await tx.justificacion.deleteMany({
          where: { trabajadorId, fechaInicio: justification.fechaInicio, fechaFin: justification.fechaFin, motivo: justification.motivo }
        });
        await tx.justificacion.create({
          data: {
            trabajadorId, fechaInicio: justification.fechaInicio, fechaFin: justification.fechaFin,
            motivo: justification.motivo, observacion: justification.observacion
          }
        });
      }
    }
    await tx.auditLog.create({
      data: {
        accion: "IMPORTACION_EXCEL",
        detalle: `${parsed.employees.length} trabajadores; ${parsed.schedules.length} horarios; ${parsed.holidays.length} feriados; ${parsed.justifications.length} justificaciones.`,
        ip
      }
    });
  }, { maxWait: 10_000, timeout: 60_000 });
}
