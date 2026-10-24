"use client";

import { useState } from "react";

export function HolidayForm() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/holidays", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha: form.get("fecha"), descripcion: form.get("descripcion") })
    });
    const body = await response.json();
    if (!response.ok) setMessage(body.error || "No se pudo guardar el feriado.");
    else window.location.reload();
  }
  return <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
    <label className="text-sm font-semibold">Fecha<input className="field mt-1" name="fecha" type="date" required /></label>
    <label className="text-sm font-semibold">Descripción<input className="field mt-1" name="descripcion" required maxLength={160} /></label>
    <button className="primary">Guardar feriado</button>
    {message && <p className="text-sm text-red-800">{message}</p>}
  </form>;
}

export function JustificationForm({ workers }: { workers: Array<{ id: string; dni: string; apellidosNombres: string }> }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/justifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries()))
    });
    const body = await response.json();
    if (!response.ok) setMessage(body.error || "No se pudo guardar la justificación.");
    else window.location.reload();
  }
  return <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-2">
    <label className="text-sm font-semibold">Trabajador<select className="field mt-1" name="trabajadorId" required>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.apellidosNombres} · {worker.dni}</option>)}</select></label>
    <label className="text-sm font-semibold">Motivo<select className="field mt-1" name="motivo"><option>LICENCIA</option><option>PERMISO</option><option>COMISION DE SERVICIO</option><option>SALUD</option><option>OTRO</option></select></label>
    <label className="text-sm font-semibold">Desde<input className="field mt-1" name="fechaInicio" type="date" required /></label>
    <label className="text-sm font-semibold">Hasta<input className="field mt-1" name="fechaFin" type="date" required /></label>
    <label className="text-sm font-semibold sm:col-span-2">Observación<input className="field mt-1" name="observacion" maxLength={250} /></label>
    <div className="sm:col-span-2"><button className="primary">Registrar justificación</button>{message && <p className="mt-2 text-sm text-red-800">{message}</p>}</div>
  </form>;
}

export function DeleteCalendarItem({ endpoint }: { endpoint: string }) {
  async function remove() {
    const motivo = window.prompt("Motivo de eliminación (obligatorio):");
    if (!motivo?.trim()) return;
    const response = await fetch(endpoint, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo })
    });
    const body = await response.json();
    if (!response.ok) window.alert(body.error || "No se pudo eliminar.");
    else window.location.reload();
  }
  return <button onClick={remove} className="text-sm font-semibold text-red-700 underline">Eliminar</button>;
}
