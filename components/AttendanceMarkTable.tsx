"use client";

import { useState } from "react";

type Mark = {
  id: string;
  tipo: string;
  horaMarcada: string;
  estado: string;
  minutosTardanza: number;
  trabajador: {
    apellidosNombres: string;
    nivel: string;
  };
};

export default function AttendanceMarkTable({ marks }: { marks: Mark[] }) {
  const [query, setQuery] = useState("");
  const [nivel, setNivel] = useState("");
  const [tipo, setTipo] = useState("");
  const levels = [...new Set(marks.map((mark) => mark.trabajador.nivel))].sort();
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const filteredMarks = marks.filter((mark) =>
    (!normalizedQuery || mark.trabajador.apellidosNombres.toLocaleLowerCase("es").includes(normalizedQuery)) &&
    (!nivel || mark.trabajador.nivel === nivel) &&
    (!tipo || mark.tipo === tipo)
  );

  return <>
    <div className="flex flex-wrap gap-3 border-b p-4">
      <label className="min-w-52 flex-1 text-sm font-medium">Buscar trabajador
        <input className="mt-1 w-full" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre y apellidos" />
      </label>
      <label className="min-w-40 text-sm font-medium">Nivel
        <select className="mt-1 w-full" value={nivel} onChange={(event) => setNivel(event.target.value)}>
          <option value="">Todos</option>
          {levels.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="min-w-40 text-sm font-medium">Tipo de marcación
        <select className="mt-1 w-full" value={tipo} onChange={(event) => setTipo(event.target.value)}>
          <option value="">Todos</option>
          <option value="ENTRADA">Entrada</option>
          <option value="SALIDA">Salida</option>
        </select>
      </label>
      <p className="self-end pb-2 text-sm text-slate-500" aria-live="polite">{filteredMarks.length} de {marks.length} registros</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="p-3">Trabajador</th><th className="p-3">Nivel</th><th className="p-3">Tipo</th><th className="p-3">Hora</th><th className="p-3">Estado</th><th className="p-3">Minutos</th></tr></thead>
        <tbody>{filteredMarks.map((mark) => <tr key={mark.id} className="border-t">
          <td className="p-3 font-semibold">{mark.trabajador.apellidosNombres}</td><td className="p-3">{mark.trabajador.nivel}</td><td className="p-3">{mark.tipo}</td><td className="p-3">{mark.horaMarcada}</td><td className="p-3">{mark.estado.replaceAll("_", " ")}</td><td className="p-3">{mark.minutosTardanza}</td>
        </tr>)}
        {filteredMarks.length === 0 && <tr><td className="p-6 text-center text-slate-500" colSpan={6}>{marks.length ? "No hay resultados para estos filtros." : "Todavía no hay marcaciones hoy."}</td></tr>}</tbody>
      </table>
    </div>
  </>;
}