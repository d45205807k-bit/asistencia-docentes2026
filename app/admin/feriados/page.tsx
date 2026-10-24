import { prisma } from "@/lib/prisma";
import { DeleteCalendarItem, HolidayForm } from "@/components/CalendarManager";

export const dynamic = "force-dynamic";

export default async function HolidaysPage() {
  const holidays = await prisma.feriado.findMany({ orderBy: { fecha: "desc" } });
  return <main className="mx-auto min-h-screen max-w-5xl space-y-5 px-4 py-7">
    <header><a className="text-sm text-sky-800 underline" href="/admin">← Dashboard</a><h1 className="mt-2 text-3xl font-bold">Feriados</h1></header>
    <HolidayForm />
    <section className="card divide-y">
      {holidays.map((holiday) => <div className="flex items-center justify-between gap-3 p-4" key={holiday.id}>
        <div><p className="font-semibold">{holiday.fecha}</p><p className="text-sm text-slate-600">{holiday.descripcion}</p></div>
        <DeleteCalendarItem endpoint={`/api/admin/holidays/${holiday.id}`} />
      </div>)}
      {!holidays.length && <p className="p-5 text-slate-600">Sin feriados registrados.</p>}
    </section>
  </main>;
}
