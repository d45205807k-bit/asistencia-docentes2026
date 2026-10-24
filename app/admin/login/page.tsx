import LoginForm from "@/components/LoginForm";
import Link from "next/link";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <main className="min-h-screen px-4 py-16">
    <div className="card mx-auto max-w-md p-7">
      <Link href="/" className="text-sm text-sky-800 underline">Volver a marcación</Link>
      <h1 className="mb-2 mt-5 text-2xl font-bold">Acceso de administrador</h1>
      <p className="mb-5 text-sm text-slate-600">Ingrese la contraseña configurada para el sistema.</p>
      <LoginForm nextPath={next} />
    </div>
  </main>;
}
