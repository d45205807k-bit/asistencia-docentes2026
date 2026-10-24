"use client";

import { useState } from "react";

type Worker = { dni: string; apellidosNombres: string; nivel: string; cargo: string };
type Result = { trabajador: Worker; tipo: string; horaMarcada: string; estado: string; minutosTardanza: number; avisoHorario?: string };

export default function AttendanceForm() {
  const [dni, setDni] = useState("");
  const [worker, setWorker] = useState<Worker | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    setWorker(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/workers?dni=${encodeURIComponent(dni)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se encontró al trabajador.");
      setWorker(body.trabajador);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo consultar el DNI.");
    } finally {
      setBusy(false);
    }
  }

  async function mark() {
    if (!worker) return;
    setBusy(true);
    setError("");
    try {
      let coordinates: { latitud: number; longitud: number } | undefined;
      const configResponse = await fetch("/api/public/config");
      if (!configResponse.ok) throw new Error("No se pudo consultar la configuración de marcación.");
      const config = await configResponse.json();
      if (config.geofenceEnabled) {
        if (!navigator.geolocation) throw new Error("Este dispositivo no permite compartir la ubicación.");
        coordinates = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve({ latitud: position.coords.latitude, longitud: position.coords.longitude }),
            () => reject(new Error("Permita el acceso a su ubicación para poder marcar.")),
            { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
          );
        });
      }
      const response = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: worker.dni, ...coordinates })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo registrar la marcación.");
      setResult(body);
      setWorker(null);
      setDni("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la marcación.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mx-auto max-w-xl p-5 sm:p-8">
      <h2 className="text-xl font-bold">Marcar asistencia</h2>
      <p className="mb-5 mt-1 text-sm text-slate-600">Ingrese su DNI para confirmar su identidad.</p>
      <form onSubmit={lookup} className="space-y-3">
        <label htmlFor="dni" className="block text-sm font-semibold">DNI</label>
        <input id="dni" className="field text-lg tracking-widest" inputMode="numeric" maxLength={8} value={dni}
          onChange={(event) => setDni(event.target.value.replace(/\D/g, ""))} placeholder="8 dígitos" required />
        <button className="primary w-full text-lg" disabled={busy || dni.length !== 8}>{busy ? "Procesando..." : "Consultar DNI"}</button>
      </form>
      {worker && <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-xs font-bold uppercase text-sky-900">Confirme sus datos</p>
        <p className="mt-2 text-lg font-bold">{worker.apellidosNombres}</p>
        <p className="text-sm text-slate-700">{worker.nivel} · {worker.cargo}</p>
        <button onClick={mark} className="primary mt-4 w-full" disabled={busy}>Confirmar y marcar</button>
      </div>}
      {result && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status">
        <p className="text-sm font-bold uppercase text-emerald-900">{result.tipo === "ENTRADA" ? "Ingreso registrado" : "Salida registrada"}</p>
        <p className="mt-2 font-bold">{result.trabajador.apellidosNombres}</p>
        <p className="text-sm">{result.horaMarcada} · {result.estado.replaceAll("_", " ")}</p>
        {result.minutosTardanza > 0 && <p className="mt-1 font-semibold text-amber-800">{result.estado === "TARDANZA" ? `Tardanza de ${result.minutosTardanza} minutos` : `Salida anticipada de ${result.minutosTardanza} minutos`}</p>}
        {result.avisoHorario && <p className="mt-1 font-semibold text-amber-800">{result.avisoHorario}</p>}
      </div>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}
    </section>
  );
}
