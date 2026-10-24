"use client";

import { useState } from "react";

export default function LoginForm({ nextPath }: { nextPath?: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo iniciar sesión.");
      window.location.assign(nextPath?.startsWith("/admin") ? nextPath : "/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="space-y-3">
    <label htmlFor="password" className="block text-sm font-semibold">Contraseña</label>
    <input id="password" type="password" className="field" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
    <button className="primary w-full" disabled={busy}>{busy ? "Ingresando..." : "Ingresar"}</button>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  </form>;
}
