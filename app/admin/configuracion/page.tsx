import SettingsForm from "@/components/SettingsForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = Object.fromEntries((await prisma.configuracion.findMany()).map((item) => [item.clave, item.valor]));
  return <main className="mx-auto min-h-screen max-w-4xl space-y-5 px-4 py-7">
    <header><a className="text-sm text-sky-800 underline" href="/admin">← Dashboard</a><h1 className="mt-2 text-3xl font-bold">Configuración</h1></header>
    <SettingsForm settings={{
      nombreIE: data.nombreIE ?? 'I.E. "Ricardo Palma"',
      toleranciaGlobal: data.toleranciaGlobal ?? "10",
      geofenceEnabled: data.geofenceEnabled ?? "false",
      geofenceLat: data.geofenceLat ?? "",
      geofenceLng: data.geofenceLng ?? "",
      geofenceRadius: data.geofenceRadius ?? "150"
    }} />
  </main>;
}
