import { prisma } from "@/lib/prisma";

export async function checkRequestLimit(scope: string, ip: string, limit: number) {
  const minuteBucket = Math.floor(Date.now() / 60_000);
  const key = `${scope}|${ip}|${minuteBucket}`;
  const entry = await prisma.requestRateLimit.upsert({
    where: { clave: key },
    update: { cantidad: { increment: 1 } },
    create: { clave: key, cantidad: 1, expiraEn: new Date((minuteBucket + 2) * 60_000) }
  });
  if (entry.cantidad === 1) await prisma.requestRateLimit.deleteMany({ where: { expiraEn: { lt: new Date() } } });
  return entry.cantidad > limit;
}
