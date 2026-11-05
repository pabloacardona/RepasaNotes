import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { AVATAR_MAX_CHARS, setUserAvatar } from "@/lib/avatar-store";

// The browser crops and shrinks the photo to 256px before sending it, so a small data URL is all that is stored.
export async function PUT(req: Request) {
  const { session, error } = await requireApiUser();
  if (error) return error;
  const body = (await req.json().catch(() => ({}))) as { avatar?: unknown };
  const avatar = body.avatar;
  if (typeof avatar !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar) || avatar.length > AVATAR_MAX_CHARS) {
    return NextResponse.json({ error: "Imagen no válida o demasiado pesada" }, { status: 400 });
  }
  try {
    await setUserAvatar(session.sub, avatar);
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la foto" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const { session, error } = await requireApiUser();
  if (error) return error;
  try {
    await setUserAvatar(session.sub, null);
  } catch {
    return NextResponse.json({ error: "No se pudo quitar la foto" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
