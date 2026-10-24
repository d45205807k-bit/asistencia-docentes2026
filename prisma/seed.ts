import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const workers = [
  { dni: "99999991", apellidosNombres: "Docente de Inicial (prueba)", nivel: "INICIAL", cargo: "DOCENTE", condicion: "CONTRATADO", horasSemanales: 30 },
  { dni: "99999992", apellidosNombres: "Docente de Primaria (prueba)", nivel: "PRIMARIA", cargo: "DOCENTE", condicion: "NOMBRADO", horasSemanales: 30 },
  { dni: "99999993", apellidosNombres: "Docente de Secundaria (prueba)", nivel: "SECUNDARIA", cargo: "DOCENTE", condicion: "CONTRATADO", horasSemanales: 24 },
  { dni: "99999994", apellidosNombres: "Personal CETPRO (prueba)", nivel: "CETPRO", cargo: "DOCENTE", condicion: "CONTRATADO", horasSemanales: 30 },
  { dni: "99999995", apellidosNombres: "Personal administrativo (prueba)", nivel: "SECUNDARIA", cargo: "ADMINISTRATIVO", condicion: "NOMBRADO", horasSemanales: 40 }
];

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    await prisma.configuracion.upsert({
      where: { clave: "adminPasswordHash" },
      update: {},
      create: { clave: "adminPasswordHash", valor: await bcrypt.hash(password, 12) }
    });
  }
  await prisma.configuracion.upsert({
    where: { clave: "nombreIE" },
    update: {},
    create: { clave: "nombreIE", valor: 'I.E. "Ricardo Palma"' }
  });
  for (const worker of workers) {
    const record = await prisma.trabajador.upsert({
      where: { dni: worker.dni },
      update: {},
      create: worker
    });
    for (let day = 1; day <= 5; day++) {
      await prisma.horario.upsert({
        where: { trabajadorId_diaSemana: { trabajadorId: record.id, diaSemana: day } },
        update: {},
        create: {
          trabajadorId: record.id, diaSemana: day, horaEntrada: day === 5 ? "13:45" : "13:00",
          horaSalida: day === 5 ? "17:45" : "18:00", toleranciaMin: 10
        }
      });
    }
  }
  console.log(`Seed listo: ${workers.length} trabajadores de prueba.${password ? " Contraseña de administrador inicializada." : " Configure ADMIN_PASSWORD para crear el acceso."}`);
}

main().catch((error) => {
  console.error("No se pudo completar el seed:", error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
