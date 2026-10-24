-- CreateTable
CREATE TABLE "Trabajador" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "apellidosNombres" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "condicion" TEXT NOT NULL DEFAULT '',
    "horasSemanales" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Horario" (
    "id" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaEntrada" TEXT,
    "horaSalida" TEXT,
    "toleranciaMin" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "Horario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marcacion" (
    "id" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "horaMarcada" TEXT NOT NULL,
    "minutosTardanza" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "origen" TEXT NOT NULL DEFAULT 'APP',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Marcacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feriado" (
    "id" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "Feriado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Justificacion" (
    "id" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "fechaInicio" TEXT NOT NULL,
    "fechaFin" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "observacion" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Justificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestRateLimit" (
    "clave" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "expiraEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestRateLimit_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trabajador_dni_key" ON "Trabajador"("dni");

-- CreateIndex
CREATE INDEX "Trabajador_activo_apellidosNombres_idx" ON "Trabajador"("activo", "apellidosNombres");

-- CreateIndex
CREATE UNIQUE INDEX "Horario_trabajadorId_diaSemana_key" ON "Horario"("trabajadorId", "diaSemana");

-- CreateIndex
CREATE INDEX "Marcacion_fecha_trabajadorId_idx" ON "Marcacion"("fecha", "trabajadorId");

-- CreateIndex
CREATE UNIQUE INDEX "Marcacion_trabajadorId_fecha_tipo_key" ON "Marcacion"("trabajadorId", "fecha", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Feriado_fecha_key" ON "Feriado"("fecha");

-- CreateIndex
CREATE INDEX "Justificacion_trabajadorId_fechaInicio_fechaFin_idx" ON "Justificacion"("trabajadorId", "fechaInicio", "fechaFin");

-- CreateIndex
CREATE INDEX "AuditLog_fecha_idx" ON "AuditLog"("fecha");

-- AddForeignKey
ALTER TABLE "Horario" ADD CONSTRAINT "Horario_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marcacion" ADD CONSTRAINT "Marcacion_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Justificacion" ADD CONSTRAINT "Justificacion_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
