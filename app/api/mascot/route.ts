import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { isMascotId, setUserMascot } from "@/lib/mascot-store";

// Saves the player's companion. "auto" clears it (a random one on every visit).
export async function PUT(req: Request) {
  const { session, error } = await requireApiUser();
  if (error) return error;
  const body = (await req.json().catch(() => ({}))) as { mascot?: unknown; slot?: unknown };
  const slot = body.slot === "baby" ? "baby" : "main";
  if (body.mascot !== "auto" && !isMascotId(body.mascot)) {
    return NextResponse.json({ error: "Mascota no válida" }, { status: 400 });
  }
  try {
    await setUserMascot(session.sub, body.mascot === "auto" ? null : (body.mascot as never), slot);
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la mascota" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
