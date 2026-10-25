import { prisma } from "@/lib/prisma";
import { limaDateTime } from "@/lib/time";
import LogoutButton from "@/components/LogoutButton";
import AttendanceMarkTable from "@/components/AttendanceMarkTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const fecha = limaDateTime().fecha;
  const [workers, marks, holidays, justifications] = await Promise.all([
    prisma.trabajador.findMany({ where: { activo: true }, include: { horarios: true }, orderBy: { apellidosNombres: "asc" } }),
    prisma.marcacion.findMany({ where: { fecha }, include: { trabajador: true }, orderBy: { creadoEn: "desc" } }),
    prisma.feriado.findMany({ where: { fecha } }),
    prisma.justificacion.findMany({ where: { fechaInicio: { lte: fecha }, fechaFin: { gte: fecha } }, select: { trabajadorId: true } })
  ]);
  const presentIds = new Set(marks.filter((mark) => mark.tipo === "ENTRADA").map((mark) => mark.trabajadorId));
  const late = marks.filter((mark) => mark.tipo === "ENTRADA" && mark.estado === "TARDANZA").length;
  const weekday = new Date(`${fecha}T12:00:00Z`).getUTCDay() || 7;
  const justifiedIds = new Set(justifications.map((item) => item.trabajadorId));
  const missing = holidays.length ? 0 : workers.filter((worker) =>
    worker.horarios.some((schedule) => schedule.diaSemana === weekday && schedule.horaEntrada && schedule.horaSalida) &&
    !justifiedIds.has(worker.id) && !presentIds.has(worker.id)
  ).length;
  return <main className="mx-auto min-h-screen max-w-7xl px-4 py-7">
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-bold uppercase tracking-widest text-sky-800">I.E. Ricardo Palma</p><h1 className="mt-1 text-3xl font-bold">Asistencia del día</h1><p className="mt-1 text-slate-600">{fecha} · America/Lima</p></div>
      <LogoutButton />
    </header>
    <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Trabajadores activos" value={workers.length} />
      <Metric label="Con ingreso" value={presentIds.size} />
      <Metric label="Tardanzas" value={late} />
      <Metric label="Sin ingreso" value={missing} />
    </section>
    <section className="card mb-6 p-5">
      <h2 className="text-lg font-bold">Descargar por período</h2>
      <form className="mt-4 flex flex-wrap items-end gap-3" action="/api/admin/reports/range" method="get">
        <label className="text-sm font-medium">Desde<input className="field mt-1" type="date" name="from" defaultValue={fecha} required /></label>
        <label className="text-sm font-medium">Hasta<input className="field mt-1" type="date" name="to" defaultValue={fecha} required /></label>
        <label className="min-w-52 flex-1 text-sm font-medium">Trabajador<select className="field mt-1" name="workerId" defaultValue=""><option value="">Todo el personal activo</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.apellidosNombres} · {worker.dni}</option>)}</select></label>
        <button className="primary" type="submit">Descargar Excel</button>
      </form>
      <p className="mt-2 text-xs text-slate-500">Intervalo máximo: 92 días.</p>
    </section>
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div><h2 className="text-lg font-bold">Marcaciones registradas</h2><p className="text-sm text-slate-500">{marks.length} registros</p></div>
        <a className="primary inline-block text-center text-sm no-underline" href={`/api/admin/reports/daily?date=${fecha}`}>Descargar Excel diario</a>
      </div>
      <AttendanceMarkTable marks={marks} />
    </section>
    <div className="mt-6 flex flex-wrap gap-3">
      <a className="card px-4 py-3 text-sm font-semibold text-sky-900" href="/api/admin/reports/monthly">Descargar consolidado del mes</a>
      <a className="card px-4 py-3 text-sm font-semibold text-sky-900" href="/admin/trabajadores">Gestionar personal</a>
      <a className="card px-4 py-3 text-sm font-semibold text-sky-900" href="/admin/configuracion">Configuración</a>
      <a className="card px-4 py-3 text-sm font-semibold text-sky-900" href="/admin/auditoria">Auditoría</a>
      <a className="card px-4 py-3 text-sm font-semibold text-sky-900" href="/admin/horarios">Horarios</a>
      <a className="card px-4 py-3 text-sm font-semibold text-sky-900" href="/admin/feriados">Feriados</a>
      <a className="card px-4 py-3 text-sm font-semibold text-sky-900" href="/admin/justificaciones">Justificaciones</a>
      <a className="card px-4 py-3 text-sm font-semibold text-sky-900" href="/admin/marcaciones">Marcaciones</a>
      <a className="card px-4 py-3 text-sm font-semibold text-sky-900" href="/api/admin/backup">Respaldar base de datos</a>
      <a className="card px-4 py-3 text-sm font-semibold text-sky-900" href="/api/admin/templates/schedules">Plantilla de Excel</a>
    </div>
  </main>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="card p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>;
}
