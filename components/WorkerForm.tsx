"use client";

import { useState } from "react";

export default function WorkerForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/admin/workers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo guardar el trabajador.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
    <label className="text-sm font-semibold">DNI<input className="field mt-1" name="dni" inputMode="numeric" pattern="\d{8}" maxLength={8} required /></label>
    <label className="text-sm font-semibold">Apellidos y nombres<input className="field mt-1" name="apellidosNombres" maxLength={160} required /></label>
    <label className="text-sm font-semibold">Nivel<select className="field mt-1" name="nivel"><option>INICIAL</option><option>PRIMARIA</option><option>SECUNDARIA</option><option>CETPRO</option></select></label>
    <label className="text-sm font-semibold">Cargo<input className="field mt-1" name="cargo" maxLength={120} required /></label>
    <label className="text-sm font-semibold">Condición<input className="field mt-1" name="condicion" maxLength={80} /></label>
    <label className="text-sm font-semibold">Horas semanales<input className="field mt-1" name="horasSemanales" type="number" min="0" max="80" defaultValue="0" /></label>
    <div className="sm:col-span-2 lg:col-span-3"><button className="primary" disabled={busy}>{busy ? "Guardando..." : "Agregar trabajador"}</button>{message && <p role="alert" className="mt-2 text-sm text-red-800">{message}</p>}</div>
  </form>;
}
