import { NextResponse } from "next/server";
import { z } from "zod";
import { parseInstitutionWorkbook } from "@/lib/importer";
import { applyWorkbookImport } from "@/lib/apply-import";
import { verifySameOrigin } from "@/lib/validation";

const formSchema = z.object({ mode: z.enum(["preview", "commit"]) });

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo enviado." }, { status: 400 });
  }
  const parsedMode = formSchema.safeParse({ mode: form.get("mode") });
  const file = form.get("file");
  if (!parsedMode.success || !(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || file.size === 0 || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Adjunte un archivo .xlsx válido de hasta 10 MB." }, { status: 400 });
  }
  let parsed;
  try {
    parsed = await parseInstitutionWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo Excel. Verifique que sea un .xlsx válido." }, { status: 400 });
  }
  if (!parsed.employees.length) parsed.errors.push("No se encontraron trabajadores válidos en la hoja Docentes.");
  if (parsedMode.data.mode === "preview" || parsed.errors.length) {
    return NextResponse.json({
      preview: true,
      trabajadores: parsed.employees.length,
      horarios: parsed.schedules.length,
      feriados: parsed.holidays.length,
      justificaciones: parsed.justifications.length,
      errores: parsed.errors.slice(0, 100)
    }, { status: parsed.errors.length ? 422 : 200 });
  }

  await applyWorkbookImport(parsed, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "");
  return NextResponse.json({
    importado: true,
    trabajadores: parsed.employees.length,
    horarios: parsed.schedules.length,
    feriados: parsed.holidays.length,
    justificaciones: parsed.justifications.length
  });
}
