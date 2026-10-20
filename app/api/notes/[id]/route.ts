import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, notes } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getNote } from "@/lib/data";
import { noteSchema, fieldErrors } from "@/lib/validators";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const notFound = () => NextResponse.json({ error: "Apunte no encontrado" }, { status: 404 });

export async function GET(_req: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const { session, error } = await requireApiUser();
  if (error) return error;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return notFound();

  const note = await getNote(session.sub, id);
  return note ? NextResponse.json({ note }) : notFound();
}

export async function PUT(req: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const { session, error } = await requireApiUser();
  if (error) return error;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return notFound();

  const parsed = noteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  const [note] = await getDb()
    .update(notes)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, session.sub)))
    .returning();
  return note ? NextResponse.json({ note }) : notFound();
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const { session, error } = await requireApiUser();
  if (error) return error;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return notFound();

  const [deleted] = await getDb()
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, session.sub)))
    .returning({ id: notes.id });
  return deleted ? NextResponse.json({ ok: true }) : notFound();
}
