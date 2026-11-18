import { NextResponse } from "next/server";
import { getDb, notes } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { listNotes, listNoteTopics } from "@/lib/data";
import { resolveNewTopic } from "@/lib/topics";
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

  // A note about a subject that already has a topic goes under that topic, so topics never split in two.
  const topic = resolveNewTopic(parsed.data.topic, await listNoteTopics(session.sub));
  const [note] = await getDb()
    .insert(notes)
    .values({ ...parsed.data, topic, userId: session.sub })
    .returning();
  return NextResponse.json({ note }, { status: 201 });
}
