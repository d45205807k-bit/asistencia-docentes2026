import { z } from "zod";

export const dniSchema = z.string().trim().regex(/^\d{8}$/, "Ingrese un DNI válido de 8 dígitos.");

export const markSchema = z.object({
  dni: dniSchema,
  latitud: z.number().min(-90).max(90).optional(),
  longitud: z.number().min(-180).max(180).optional()
}).refine((value) => (value.latitud === undefined) === (value.longitud === undefined), {
  message: "Debe enviar ambas coordenadas."
});

export const loginSchema = z.object({ password: z.string().min(1).max(200) });

export function verifySameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return new URL(origin).host === new URL(request.url).host;
}
