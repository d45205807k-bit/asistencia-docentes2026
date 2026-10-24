"use client";

import { useEffect, useState } from "react";

export default function LiveClock() {
  const [timestamp, setTimestamp] = useState<number | null>(null);
  useEffect(() => {
    let serverTimestamp = 0;
    let performanceBase = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    fetch("/api/public/config").then(async (response) => {
      if (!response.ok) throw new Error("No se pudo sincronizar el reloj.");
      const body = await response.json();
      serverTimestamp = body.timestampServidor;
      performanceBase = performance.now();
      setTimestamp(serverTimestamp);
      interval = setInterval(() => setTimestamp(serverTimestamp + performance.now() - performanceBase), 1000);
    }).catch(() => setTimestamp(null));
    return () => { if (interval) clearInterval(interval); };
  }, []);
  const label = timestamp === null ? "Hora oficial de Lima" : new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).format(timestamp);
  return <p className="mt-2 font-mono text-xl font-semibold text-sky-900" aria-label="Hora del servidor">{label}</p>;
}
