import { prisma } from "@/lib/prisma";
import ScheduleEditor from "@/components/ScheduleEditor";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const workers = await prisma.trabajador.findMany({
    where: { activo: true }, include: { horarios: true }, orderBy: { apellidosNombres: "asc" }
  });
  return <main className="mx-auto min-h-screen max-w-5xl space-y-5 px-4 py-7">
    <header><a className="text-sm text-sky-800 underline" href="/admin">← Dashboard</a><h1 className="mt-2 text-3xl font-bold">Horarios</h1></header>
    <ScheduleEditor workers={workers.map((worker) => ({
      id: worker.id, dni: worker.dni, apellidosNombres: worker.apellidosNombres,
      schedules: worker.horarios.map((schedule) => ({
        diaSemana: schedule.diaSemana, horaEntrada: schedule.horaEntrada, horaSalida: schedule.horaSalida, toleranciaMin: schedule.toleranciaMin
      }))
    }))} />
  </main>;
}
