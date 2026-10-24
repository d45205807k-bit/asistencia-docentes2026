"use client";

export default function WorkerStatusButton({ id, active }: { id: string; active: boolean }) {
  async function toggle() {
    const motivo = window.prompt(active ? "Motivo de la baja lógica:" : "Motivo de la reactivación:");
    if (!motivo?.trim()) return;
    const response = await fetch(`/api/admin/workers/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !active, motivo })
    });
    const body = await response.json();
    if (!response.ok) window.alert(body.error || "No se pudo actualizar.");
    else window.location.reload();
  }
  return <button className="text-sm font-semibold text-sky-800 underline" onClick={toggle}>{active ? "Dar de baja" : "Reactivar"}</button>;
}
