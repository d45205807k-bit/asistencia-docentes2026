import AttendanceForm from "@/components/AttendanceForm";
import LiveClock from "@/components/LiveClock";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const setting = await prisma.configuracion.findUnique({ where: { clave: "nombreIE" } }).catch(() => null);
  return (
    <main className="min-h-screen px-4 py-8">
      <header className="mx-auto mb-8 max-w-xl text-center">
        <div className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-sky-800">Control de asistencia</div>
        <h1 className="text-3xl font-bold">{setting?.valor || 'I.E. "Ricardo Palma"'}</h1>
        <p className="mt-2 text-slate-600">Marcona · UGEL Nasca · DRE Ica</p>
        <LiveClock />
      </header>
      <AttendanceForm />
      <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-5 text-slate-500">
        Aviso de privacidad: se registra la hora del servidor y, si se habilita geolocalización, la ubicación para el control de asistencia.
      </p>
      <div className="mx-auto mt-8 max-w-xl text-center">
        <a className="text-sm font-semibold text-sky-800 underline" href="/admin/login">Administrador</a>
      </div>
    </main>
  );
}
