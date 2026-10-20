import { NextResponse } from "next/server";
import { getDb, quizzes } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getQuiz } from "@/lib/data";

// Creates a new quiz with only the questions answered wrong (no AI call).
export async function POST(_req: Request, ctx: RouteContext<"/api/quizzes/[id]/review">) {
  const { session, error } = await requireApiUser();
  if (error) return error;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });
  }

  const quiz = await getQuiz(session.sub, id);
  if (!quiz || !quiz.answers) {
    return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });
  }

  const wrong = quiz.questions.filter((q, i) => quiz.answers![i] !== q.correctIndex);
  if (wrong.length === 0) {
    return NextResponse.json({ error: "No tienes errores que repasar" }, { status: 400 });
  }

  const baseTitle = quiz.title.replace(/^Repaso: /, "");
  const [created] = await getDb()
    .insert(quizzes)
    .values({
      userId: session.sub,
      noteId: quiz.noteId,
      title: `Repaso: ${baseTitle}`,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      questions: wrong,
      total: wrong.length,
    })
    .returning({ id: quizzes.id });

  return NextResponse.json({ quiz: created }, { status: 201 });
}
