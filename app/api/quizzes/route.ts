import { NextResponse } from "next/server";
import { getDb, quizzes } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getNote, listQuizzes } from "@/lib/data";
import { generateQuestions, AIGenerationError } from "@/lib/ai";
import { generateQuizSchema, fieldErrors } from "@/lib/validators";

export const maxDuration = 60;

export async function GET() {
  const { session, error } = await requireApiUser();
  if (error) return error;
  return NextResponse.json({ quizzes: await listQuizzes(session.sub) });
}

export async function POST(req: Request) {
  const { session, error } = await requireApiUser();
  if (error) return error;

  const parsed = generateQuizSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }
  const { noteId, count, difficulty } = parsed.data;

  const note = await getNote(session.sub, noteId);
  if (!note) {
    return NextResponse.json({ errors: { noteId: "Apunte no encontrado" } }, { status: 404 });
  }

  try {
    const questions = await generateQuestions({
      title: note.title,
      topic: note.topic,
      content: note.content,
      count,
      difficulty,
    });

    const [quiz] = await getDb()
      .insert(quizzes)
      .values({
        userId: session.sub,
        noteId: note.id,
        title: note.title,
        topic: note.topic,
        difficulty,
        questions,
        total: questions.length,
      })
      .returning({ id: quizzes.id });

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return NextResponse.json({ errors: { form: err.message } }, { status: 502 });
    }
    console.error("quiz generation failed", err);
    return NextResponse.json(
      { errors: { form: "Error inesperado al generar el quiz" } },
      { status: 500 },
    );
  }
}
