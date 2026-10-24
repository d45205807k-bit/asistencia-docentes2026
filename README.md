# Control de asistencia docente

Aplicación web mobile-first para la I.E. Ricardo Palma (Marcona, UGEL Nasca, DRE Ica). Interfaz y cálculos de horario usan `America/Lima`.

## Requisitos e instalación

- Node.js 20.9 o posterior y npm.
- Proyecto PostgreSQL en Supabase (el proveedor de Prisma está configurado para PostgreSQL).

```powershell
npm install
Copy-Item .env.example .env
```

En Supabase cree un proyecto y copie sus cadenas de conexión. En `.env`, configure `DATABASE_URL` con el **Transaction pooler** (puerto 6543) y `DIRECT_URL` con la conexión directa o el **Session pooler** (puerto 5432). Sustituya los marcadores; no pegue ni suba esas cadenas al repositorio. Establezca además una contraseña de administrador segura y un secreto aleatorio de al menos 32 caracteres.

Para desarrollo, use una base de datos Supabase de desarrollo, separada de producción:

```powershell
npm run db:migrate -- --name init
npm run seed
npm run dev
```

Abra <http://localhost:3000>. El `seed` agrega cinco trabajadores de prueba con DNI ficticios `99999991`–`99999995`; no ejecute el seed en la base productiva. El `.gitignore` excluye el Excel institucional y la imagen del espacio de trabajo.

## Uso

### Trabajadores

1. Ingrese el DNI de ocho dígitos.
2. Verifique nombre, nivel y cargo.
3. Confirme la marcación. La hora proviene del servidor, no del celular.
4. La primera marcación del día registra entrada y la segunda salida; un clic repetido en los siguientes dos minutos se rechaza.

### Administrador

Entre desde el enlace **Administrador** con la contraseña de `ADMIN_PASSWORD` (se almacena con bcrypt). El panel muestra el resumen y registros diarios. En **Personal** se agregan personas manualmente o se importa el Excel institucional. Los reportes diario y mensual se descargan desde el panel.

## Importar el Excel institucional

La pantalla **Personal → Importar el Excel institucional** permite validar y previsualizar y, después de confirmar, importar las hojas `Docentes`, `Horarios`, `Horario_Periodos`, `Feriados` y `Justificaciones`. La importación reemplaza los horarios importados de cada trabajador y actualiza trabajadores por DNI. Las justificaciones se agregan como nuevos registros; evite repetir una importación con la misma hoja para no duplicarlas.

También se puede ejecutar el importador desde terminal:

```powershell
npm run import:workbook -- "C:\ruta\HORARIO-ACTUALIZADO.xlsx"
```

El script de terminal se ejecuta después de migrar la base y usa `DATABASE_URL` del entorno. Para transferir los datos institucionales, no suba el archivo Excel a un repositorio público.

## Reportes

- Diario: Excel con horarios del día, entrada/salida, código de asistencia, minutos y observaciones.
- Mensual: consolidado con códigos por día hábil, detalle de marcaciones, resumen por nivel y fórmulas de Excel para totales.

## Desplegar en Vercel y Supabase

El proveedor Prisma y la migración inicial están configurados para PostgreSQL. `vercel.json` ejecuta `npm run vercel-build`: en el entorno Production aplica `prisma migrate deploy` antes del build; en Preview compila sin modificar la base productiva.

1. Cree un proyecto Supabase PostgreSQL para producción; copie el Transaction pooler y la conexión directa o Session pooler.
2. Suba este código a la rama GitHub conectada al proyecto Vercel. El `.gitignore` excluye el Excel institucional.
3. En Vercel > **Settings > Environment Variables**, configure para **Production**: `DATABASE_URL`, `DIRECT_URL`, `ADMIN_PASSWORD`, `JWT_SECRET` y `TZ=America/Lima`. Use contraseñas propias, fuertes y únicas.
4. En Vercel > **Settings > Build and Deployment**, confirme que el Build Command sea `npm run vercel-build`. Vercel instalará las dependencias y ejecutará la migración PostgreSQL y el build de Next.
5. Desactive Preview Deployments o defina para Preview un proyecto/base de datos Supabase de pruebas distinto. No use la base productiva en vistas previas.
6. Cuando finalice el primer despliegue, abra el dominio Vercel y valide la pantalla pública, el login y la importación de datos. La importación del Excel es manual desde **Personal**; no transfiera personal real hasta revisar la previsualización.

Nunca comparta aquí ni suba a GitHub las cadenas de conexión, la contraseña de la base o `JWT_SECRET`. Guárdelas únicamente como variables secretas en Vercel y en el `.env` local, que está excluido de Git. Las migraciones productivas se versionan en `prisma/migrations`; no ejecute `prisma migrate dev` contra producción.

Para despliegues con varias instancias, el límite por minuto se guarda actualmente en PostgreSQL y es compartido, pero se deben revisar los límites del pooler y el `X-Forwarded-For` del proxy antes de abrir el servicio públicamente.

## Estado y supuestos

- Implementado: marcación pública entrada/salida, cálculo de tardanza y salida anticipada, horarios por día, inicio de sesión admin con cookie firmada, dashboard, altas de personal, importación Excel institucional, feriados/justificaciones importados y reportes diario/mensual.
- El seed usa trabajadores ficticios y no copia datos personales del archivo de horarios.
- Se considera que la asistencia está completa solo si existe entrada y salida; una marca incompleta se codifica como falta.
- La importación detallada prioriza `Horario_Periodos` sobre los horarios uniformes de `Horarios`.

## Pendiente antes de uso operativo

Antes de uso operativo, valide todos los horarios y datos importados y configure la contraseña, el radio y las coordenadas de la geovalla. La pantalla de personal permite altas y bajas lógicas; la edición de otros datos se realiza reimportando el Excel. El panel no incluye todavía filtros en vivo de la tabla, ni descarga por rango/por trabajador.
