"use client";

export default function ManualMarkForm({ workers }: { workers: Array<{ id: string; dni: string; apellidosNombres: string }> }) {
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/marks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries()))
    });
    const body = await response.json();
    if (!response.ok) window.alert(body.error || "No se pudo registrar.");
    else window.location.reload();
  }
  return <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
    <label className="text-sm font-semibold">Trabajador<select className="field mt-1" name="trabajadorId" required>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.apellidosNombres} · {worker.dni}</option>)}</select></label>
    <label className="text-sm font-semibold">Fecha<input className="field mt-1" type="date" name="fecha" required /></label>
    <label className="text-sm font-semibold">Tipo<select className="field mt-1" name="tipo"><option>ENTRADA</option><option>SALIDA</option></select></label>
    <label className="text-sm font-semibold">Hora<input className="field mt-1" type="time" name="hora" step="1" required /></label>
    <label className="text-sm font-semibold sm:col-span-2">Motivo<input className="field mt-1" name="motivo" required minLength={3} maxLength={250} /></label>
    <button className="primary lg:col-span-3">Agregar marcación manual</button>
  </form>;
}
