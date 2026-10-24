import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asistencia Docente | I.E. Ricardo Palma",
  description: "Sistema de control de asistencia docente de la I.E. Ricardo Palma."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
