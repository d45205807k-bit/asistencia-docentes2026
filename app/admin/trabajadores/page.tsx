import { prisma } from "@/lib/prisma";
import WorkerForm from "@/components/WorkerForm";
import WorkbookImporter from "@/components/WorkbookImporter";
import WorkerStatusButton from "@/components/WorkerStatusButton";

export const dynamic = "force-dynamic";

export default async function WorkersPage() {
  const workers = await prisma.trabajador.findMany({ orderBy: { apellidosNombres: "asc" } });
  return <main className="mx-auto min-h-screen max-w-7xl space-y-5 px-4 py-7">
    <header><a className="text-sm text-sky-800 underline" href="/admin">← Dashboard</a><h1 className="mt-2 text-3xl font-bold">Personal</h1></header>
    <WorkerForm />
    <WorkbookImporter />
    <section className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase"><tr><th className="p-3">DNI</th><th className="p-3">Apellidos y nombres</th><th className="p-3">Nivel</th><th className="p-3">Cargo</th><th className="p-3">Condición</th><th className="p-3">Estado</th><th className="p-3">Acción</th></tr></thead>
        <tbody>{workers.map((worker) => <tr key={worker.id} className="border-t"><td className="p-3">{worker.dni}</td><td className="p-3 font-semibold">{worker.apellidosNombres}</td><td className="p-3">{worker.nivel}</td><td className="p-3">{worker.cargo}</td><td className="p-3">{worker.condicion}</td><td className="p-3">{worker.activo ? "Activo" : "Inactivo"}</td><td className="p-3"><WorkerStatusButton id={worker.id} active={worker.activo} /></td></tr>)}</tbody>
      </table>
    </section>
  </main>;
}
