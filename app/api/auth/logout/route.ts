import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { neonAuth } from "@/lib/neon-auth-server";

export async function POST() {
  // Also close the Neon Auth session (the Google one), so "Continuar con Google" asks again on a shared computer.
  await neonAuth.signOut().catch(() => {});
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
