import { readFile } from "node:fs/promises";
import { prisma } from "../lib/prisma";
import { applyWorkbookImport } from "../lib/apply-import";
import { parseInstitutionWorkbook } from "../lib/importer";

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error('Indique la ruta del archivo: npm run import:workbook -- "C:\\ruta\\HORARIO-ACTUALIZADO.xlsx"');
  const buffer = await readFile(path);
  const parsed = await parseInstitutionWorkbook(buffer);
  if (parsed.errors.length || !parsed.employees.length) {
    console.error("No se importó ningún dato. Corrija estos errores:");
    for (const error of parsed.errors) console.error(`- ${error}`);
    if (!parsed.employees.length && parsed.errors.length === 0) console.error("- No hay trabajadores válidos.");
    process.exitCode = 1;
    return;
  }
  console.log(`Se importarán ${parsed.employees.length} trabajadores, ${parsed.schedules.length} horarios, ${parsed.holidays.length} feriados y ${parsed.justifications.length} justificaciones.`);
  await applyWorkbookImport(parsed, "script local");
  console.log("Importación completada.");
}

main().catch((error) => {
  console.error("Falló la importación del Excel:", error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
