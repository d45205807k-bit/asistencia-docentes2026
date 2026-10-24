import { prisma } from "@/lib/prisma";
import ManualMarkForm from "@/components/ManualMarkForm";
import DeleteMarkButton from "@/components/DeleteMarkButton";
import EditMarkButton from "@/components/EditMarkButton";

export const dynamic = "force-dynamic";

export default async function MarksPage() {
  const [workers, marks] = await Promise.all([
    prisma.trabajador.findMany({ where: { activo: true }, select: { id: true, dni: true, apellidosNombres: true }, orderBy: { apellidosNombres: "asc" } }),
    prisma.marcacion.findMany({ include: { trabajador: true }, orderBy: [{ fecha: "desc" }, { horaMarcada: "desc" }], take: 250 })
  ]);
  return <main className="mx-auto min-h-screen max-w-7xl space-y-5 px-4 py-7">
    <header><a className="text-sm text-sky-800 underline" href="/admin">← Dashboard</a><h1 className="mt-2 text-3xl font-bold">Marcaciones</h1></header>
    {workers.length > 0 && <ManualMarkForm workers={workers} />}
    <section className="card overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase"><tr><th className="p-3">Fecha</th><th className="p-3">Trabajador</th><th className="p-3">Tipo</th><th className="p-3">Hora</th><th className="p-3">Estado</th><th className="p-3">Minutos</th><th className="p-3">Origen</th><th className="p-3">Acción</th></tr></thead>
        <tbody>{marks.map((mark) => <tr key={mark.id} className="border-t">
          <td className="p-3">{mark.fecha}</td><td className="p-3">{mark.trabajador.apellidosNombres}</td><td className="p-3">{mark.tipo}</td><td className="p-3">{mark.horaMarcada}</td><td className="p-3">{mark.estado}</td><td className="p-3">{mark.minutosTardanza}</td><td className="p-3">{mark.origen}</td><td className="flex gap-3 p-3"><EditMarkButton id={mark.id} fecha={mark.fecha} hora={mark.horaMarcada} tipo={mark.tipo} /><DeleteMarkButton id={mark.id} /></td>
        </tr>)}</tbody>
      </table>
      {marks.length === 0 && <p className="p-5 text-slate-600">Sin marcaciones registradas.</p>}
    </section>
  </main>;
}
