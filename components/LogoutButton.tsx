"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }
  return <button onClick={logout} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Cerrar sesión</button>;
}
