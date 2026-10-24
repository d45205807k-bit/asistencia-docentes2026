"use client";

import { useState } from "react";

type Preview = { trabajadores: number; horarios: number; feriados: number; justificaciones: number; errores: string[] };

export default function WorkbookImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(mode: "preview" | "commit") {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("mode", mode);
      const response = await fetch("/api/admin/import/workbook", { method: "POST", body: form });
      const body = await response.json();
      if (mode === "preview" && (response.ok || response.status === 422)) setPreview(body);
      if (!response.ok) throw new Error(body.errores?.join(" ") || body.error || "No se pudo procesar la importación.");
      if (mode === "commit") {
        setMessage(`Importación finalizada: ${body.trabajadores} trabajadores y ${body.horarios} horarios.`);
        setPreview(null);
        window.location.reload();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al procesar el archivo.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="card p-5">
    <h2 className="font-bold">Importar el Excel institucional</h2>
    <p className="mb-4 mt-1 text-sm text-slate-600">Lee Docentes, Horarios, Horario_Periodos, Feriados y Justificaciones.</p>
    <div className="flex flex-col gap-3 sm:flex-row">
      <input className="field" type="file" accept=".xlsx" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setMessage(""); }} />
      <button className="primary shrink-0" disabled={!file || busy} onClick={() => send("preview")}>{busy ? "Procesando..." : "Validar y previsualizar"}</button>
    </div>
    <a className="mt-3 inline-block text-sm font-semibold text-sky-800 underline" href="/api/admin/templates/schedules">Descargar plantilla Excel</a>
    {preview && <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
      <p>Personal: {preview.trabajadores} · Horarios: {preview.horarios} · Feriados: {preview.feriados} · Justificaciones: {preview.justificaciones}</p>
      {preview.errores.length > 0 && <ul className="mt-3 list-inside list-disc text-red-700">{preview.errores.slice(0, 12).map((error, index) => <li key={index}>{error}</li>)}</ul>}
      {preview.errores.length === 0 && <button className="primary mt-4" disabled={busy} onClick={() => send("commit")}>Confirmar importación</button>}
    </div>}
    {message && <p className="mt-3 text-sm font-semibold text-red-800" role="status">{message}</p>}
  </div>;
}
