"use client";

import { useState } from "react";

type Settings = { nombreIE: string; toleranciaGlobal: string; geofenceEnabled: string; geofenceLat: string; geofenceLng: string; geofenceRadius: string };

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      nombreIE: String(form.get("nombreIE") ?? ""),
      toleranciaGlobal: Number(form.get("toleranciaGlobal")),
      geofenceEnabled: form.get("geofenceEnabled") === "on",
      geofenceLat: form.get("geofenceLat") ? Number(form.get("geofenceLat")) : null,
      geofenceLng: form.get("geofenceLng") ? Number(form.get("geofenceLng")) : null,
      geofenceRadius: Number(form.get("geofenceRadius")),
      nuevaPassword: String(form.get("nuevaPassword") ?? "") || undefined
    };
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo guardar.");
      setMessage("Configuración guardada correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="card space-y-5 p-5">
    <label className="block text-sm font-semibold">Nombre de la institución<input className="field mt-1" name="nombreIE" defaultValue={settings.nombreIE} required maxLength={120} /></label>
    <label className="block text-sm font-semibold">Tolerancia global (minutos)<input className="field mt-1 max-w-xs" type="number" name="toleranciaGlobal" min="0" max="120" defaultValue={settings.toleranciaGlobal || "10"} required /></label>
    <div className="border-t pt-4">
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="geofenceEnabled" defaultChecked={settings.geofenceEnabled === "true"} /> Activar geovalla</label>
      <p className="mb-3 mt-1 text-xs text-slate-600">Obtenga las coordenadas del colegio desde un mapa. El navegador las solicitará al marcar.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Latitud<input className="field mt-1" name="geofenceLat" type="number" step="any" defaultValue={settings.geofenceLat} /></label>
        <label className="text-sm">Longitud<input className="field mt-1" name="geofenceLng" type="number" step="any" defaultValue={settings.geofenceLng} /></label>
        <label className="text-sm">Radio (metros)<input className="field mt-1" name="geofenceRadius" type="number" min="10" max="10000" defaultValue={settings.geofenceRadius || "150"} required /></label>
      </div>
    </div>
    <div className="border-t pt-4">
      <label className="block text-sm font-semibold">Cambiar contraseña (opcional)<input className="field mt-1 max-w-md" name="nuevaPassword" type="password" minLength={12} autoComplete="new-password" placeholder="Mínimo 12 caracteres" /></label>
    </div>
    <button className="primary" disabled={busy}>{busy ? "Guardando..." : "Guardar configuración"}</button>
    {message && <p role="status" className="text-sm font-semibold text-sky-900">{message}</p>}
  </form>;
}
