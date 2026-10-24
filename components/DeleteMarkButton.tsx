"use client";

export default function DeleteMarkButton({ id }: { id: string }) {
  async function remove() {
    const motivo = window.prompt("Motivo de eliminación (obligatorio):");
    if (!motivo?.trim()) return;
    const response = await fetch(`/api/admin/marks/${id}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo })
    });
    const body = await response.json();
    if (!response.ok) window.alert(body.error || "No se pudo eliminar la marcación.");
    else window.location.reload();
  }
  return <button onClick={remove} className="text-sm font-semibold text-red-700 underline">Eliminar</button>;
}
