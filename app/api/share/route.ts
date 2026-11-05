import { NextResponse } from "next/server";
import { getDb, sharedQuizzes } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getNote, getQuiz } from "@/lib/data";

// Publishes one of the user's quizzes as a link. mode "fixed": same questions for all (shuffled per visitor).
// mode "variant": the AI writes a different quiz for each visitor from the same note.
export async function POST(req: Request) {
  const { session, error } = await requireApiUser();
  if (error) return error;
  const body = await req.json().catch(() => null);
  const quizId = String(body?.quizId ?? "");
  const mode = body?.mode === "variant" ? "variant" : "fixed";
  if (!/^[0-9a-f-]{36}$/i.test(quizId)) return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });

  const quiz = await getQuiz(session.sub, quizId);
  if (!quiz) return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });

  let noteContent: string | null = null;
  if (mode === "variant") {
    const note = quiz.noteId ? await getNote(session.sub, quiz.noteId) : null;
    if (!note) {
      return NextResponse.json({ error: "Este quiz ya no tiene un apunte asociado. Usa la opción de quiz fijo." }, { status: 400 });
    }
    noteContent = note.content;
  }

  const [created] = await getDb()
    .insert(sharedQuizzes)
    .values({
      userId: session.sub,
      mode,
      title: quiz.title.replace(/^(Repaso|Repetición): /, ""),
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      count: quiz.questions.length,
      questions: quiz.questions,
      noteContent,
    })
    .returning({ id: sharedQuizzes.id });

  return NextResponse.json({ id: created.id, path: `/s/${created.id}` }, { status: 201 });
}
