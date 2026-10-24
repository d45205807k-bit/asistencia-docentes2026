import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const events = await prisma.auditLog.findMany({ orderBy: { fecha: "desc" }, take: 200 });
  return <main className="mx-auto min-h-screen max-w-6xl px-4 py-7">
    <header className="mb-5"><a className="text-sm text-sky-800 underline" href="/admin">← Dashboard</a><h1 className="mt-2 text-3xl font-bold">Auditoría</h1></header>
    <section className="card overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase"><tr><th className="p-3">Fecha</th><th className="p-3">Acción</th><th className="p-3">Detalle</th><th className="p-3">IP</th></tr></thead>
        <tbody>{events.map((event) => <tr key={event.id} className="border-t"><td className="p-3">{event.fecha.toLocaleString("es-PE", { timeZone: "America/Lima" })}</td><td className="p-3 font-semibold">{event.accion}</td><td className="p-3">{event.detalle}</td><td className="p-3">{event.ip}</td></tr>)}</tbody>
      </table>
      {events.length === 0 && <p className="p-5 text-slate-600">Sin acciones registradas.</p>}
    </section>
  </main>;
}
