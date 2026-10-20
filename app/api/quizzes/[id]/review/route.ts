import { NextResponse } from "next/server";
import { getDb, quizzes } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getQuiz } from "@/lib/data";

// Creates a new quiz from a finished one, without calling the AI.
// mode "errors" (default): only the questions answered wrong.
// mode "all": every question, shuffled.
export async function POST(req: Request, ctx: RouteContext<"/api/quizzes/[id]/review">) {
  const { session, error } = await requireApiUser();
  if (error) return error;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "all" ? "all" : "errors";

  const quiz = await getQuiz(session.sub, id);
  if (!quiz || !quiz.answers) {
    return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });
  }

  let questions = quiz.questions;
  if (mode === "errors") {
    questions = quiz.questions.filter((q, i) => quiz.answers![i] !== q.correctIndex);
    if (questions.length === 0) {
      return NextResponse.json({ error: "No tienes errores que repasar" }, { status: 400 });
    }
  } else {
    questions = [...questions].sort(() => Math.random() - 0.5);
  }

  const baseTitle = quiz.title.replace(/^(Repaso|Repetición): /, "");
  const [created] = await getDb()
    .insert(quizzes)
    .values({
      userId: session.sub,
      noteId: quiz.noteId,
      title: `${mode === "errors" ? "Repaso" : "Repetición"}: ${baseTitle}`,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      questions,
      total: questions.length,
    })
    .returning({ id: quizzes.id });

  return NextResponse.json({ quiz: created }, { status: 201 });
}
