"use client";

import { useMemo, useState } from "react";

type Schedule = { diaSemana: number; horaEntrada: string | null; horaSalida: string | null; toleranciaMin: number };
type Worker = { id: string; dni: string; apellidosNombres: string; schedules: Schedule[] };
const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export default function ScheduleEditor({ workers }: { workers: Worker[] }) {
  const [workerId, setWorkerId] = useState(workers[0]?.id ?? "");
  const worker = useMemo(() => workers.find((item) => item.id === workerId), [workerId, workers]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!worker) return;
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const schedules = days.map((_, index) => {
      const entry = String(form.get(`entrada-${index + 1}`) || "");
      const exit = String(form.get(`salida-${index + 1}`) || "");
      return {
        diaSemana: index + 1,
        horaEntrada: entry || null,
        horaSalida: exit || null,
        toleranciaMin: Number(form.get(`tolerancia-${index + 1}`) || 10)
      };
    });
    try {
      const response = await fetch(`/api/admin/schedules/${worker.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: form.get("reason"), schedules })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo guardar el horario.");
      setMessage("Horario actualizado.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  if (!workers.length) return <p className="card p-5">Agregue o importe trabajadores antes de asignar horarios.</p>;
  return <section className="card p-5">
    <label className="block text-sm font-semibold">Trabajador
      <select className="field mt-1" value={workerId} onChange={(event) => setWorkerId(event.target.value)}>
        {workers.map((item) => <option key={item.id} value={item.id}>{item.apellidosNombres} · {item.dni}</option>)}
      </select>
    </label>
    {worker && <form onSubmit={submit} className="mt-5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead><tr className="border-b"><th className="pb-2">Día</th><th className="pb-2">Entrada</th><th className="pb-2">Salida</th><th className="pb-2">Tolerancia</th></tr></thead>
          <tbody>{days.map((day, index) => {
            const schedule = worker.schedules.find((item) => item.diaSemana === index + 1);
            return <tr key={day} className="border-b">
              <td className="py-2 font-semibold">{day}</td>
              <td className="p-2"><input className="field" name={`entrada-${index + 1}`} type="time" defaultValue={schedule?.horaEntrada ?? ""} /></td>
              <td className="p-2"><input className="field" name={`salida-${index + 1}`} type="time" defaultValue={schedule?.horaSalida ?? ""} /></td>
              <td className="p-2"><input className="field" name={`tolerancia-${index + 1}`} type="number" min="0" max="120" defaultValue={schedule?.toleranciaMin ?? 10} /></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p className="my-3 text-xs text-slate-600">Deje ambas horas vacías si no labora ese día.</p>
      <label className="block text-sm font-semibold">Motivo del cambio<input className="field mt-1" name="reason" required minLength={3} maxLength={250} /></label>
      <button className="primary mt-4" disabled={busy}>{busy ? "Guardando..." : "Guardar horario"}</button>
      {message && <p className="mt-3 text-sm font-semibold text-sky-900">{message}</p>}
    </form>}
  </section>;
}
