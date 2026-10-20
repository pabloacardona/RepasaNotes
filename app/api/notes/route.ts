import { NextResponse } from "next/server";
import { getDb, notes } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { listNotes } from "@/lib/data";
import { noteSchema, fieldErrors } from "@/lib/validators";

export async function GET() {
  const { session, error } = await requireApiUser();
  if (error) return error;
  return NextResponse.json({ notes: await listNotes(session.sub) });
}

export async function POST(req: Request) {
  const { session, error } = await requireApiUser();
  if (error) return error;

  const parsed = noteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  const [note] = await getDb()
    .insert(notes)
    .values({ ...parsed.data, userId: session.sub })
    .returning();
  return NextResponse.json({ note }, { status: 201 });
}
