import AttendanceForm from "@/components/AttendanceForm";
import LiveClock from "@/components/LiveClock";
import { prisma } from "@/lib/prisma";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const setting = await prisma.configuracion.findUnique({ where: { clave: "nombreIE" } }).catch(() => null);
  return (
    <main className="min-h-screen px-4 py-5 sm:py-8">
      <header className="mx-auto mb-6 max-w-xl">
        <nav className="mb-5 flex justify-end">
          <a className="primary inline-flex items-center justify-center text-sm no-underline" href="/admin/login">Administrador</a>
        </nav>
        <div className="flex items-center justify-center gap-4">
          <Image
            src="/insignia-ricardo-palma.jpeg"
            alt="Insignia de la I.E. Ricardo Palma de Marcona"
            width={88}
            height={100}
            className="h-16 w-14 shrink-0 object-contain sm:h-20 sm:w-[70px]"
            priority
          />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-800 sm:text-sm">Control de asistencia</p>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">{setting?.valor || 'I.E. "Ricardo Palma"'}</h1>
            <p className="mt-1 text-sm text-slate-600">Marcona · UGEL Nasca · DRE Ica</p>
            <LiveClock />
          </div>
        </div>
      </header>
      <AttendanceForm />
      <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-5 text-slate-500">
        Aviso de privacidad: se registra la hora del servidor y, si se habilita geolocalización, la ubicación para el control de asistencia.
      </p>
    </main>
  );
}
