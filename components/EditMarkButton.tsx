"use client";

export default function EditMarkButton({ id, fecha, hora, tipo }: { id: string; fecha: string; hora: string; tipo: string }) {
  async function edit() {
    const newDate = window.prompt("Fecha (AAAA-MM-DD):", fecha);
    if (!newDate) return;
    const newTime = window.prompt("Hora (HH:mm:ss):", hora);
    if (!newTime) return;
    const newType = window.prompt("Tipo (ENTRADA o SALIDA):", tipo);
    if (!newType) return;
    const motivo = window.prompt("Motivo de la corrección (obligatorio):");
    if (!motivo?.trim()) return;
    const response = await fetch(`/api/admin/marks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha: newDate, hora: newTime, tipo: newType.toUpperCase(), motivo })
    });
    const body = await response.json();
    if (!response.ok) window.alert(body.error || "No se pudo editar la marcación.");
    else window.location.reload();
  }
  return <button onClick={edit} className="text-sm font-semibold text-sky-800 underline">Editar</button>;
}
