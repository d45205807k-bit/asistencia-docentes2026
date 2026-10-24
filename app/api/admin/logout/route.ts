import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/validation";

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
