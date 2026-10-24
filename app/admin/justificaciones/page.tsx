import { prisma } from "@/lib/prisma";
import { DeleteCalendarItem, JustificationForm } from "@/components/CalendarManager";

export const dynamic = "force-dynamic";

export default async function JustificationsPage() {
  const [workers, justifications] = await Promise.all([
    prisma.trabajador.findMany({ where: { activo: true }, select: { id: true, dni: true, apellidosNombres: true }, orderBy: { apellidosNombres: "asc" } }),
    prisma.justificacion.findMany({ include: { trabajador: true }, orderBy: { fechaInicio: "desc" }, take: 300 })
  ]);
  return <main className="mx-auto min-h-screen max-w-5xl space-y-5 px-4 py-7">
    <header><a className="text-sm text-sky-800 underline" href="/admin">← Dashboard</a><h1 className="mt-2 text-3xl font-bold">Justificaciones</h1></header>
    {workers.length ? <JustificationForm workers={workers} /> : <p className="card p-5">Agregue trabajadores para registrar justificaciones.</p>}
    <section className="card divide-y">
      {justifications.map((item) => <div className="flex items-center justify-between gap-3 p-4" key={item.id}>
        <div><p className="font-semibold">{item.trabajador.apellidosNombres} · {item.motivo}</p><p className="text-sm text-slate-600">{item.fechaInicio} a {item.fechaFin} {item.observacion ? `· ${item.observacion}` : ""}</p></div>
        <DeleteCalendarItem endpoint={`/api/admin/justifications/${item.id}`} />
      </div>)}
      {!justifications.length && <p className="p-5 text-slate-600">Sin justificaciones registradas.</p>}
    </section>
  </main>;
}
