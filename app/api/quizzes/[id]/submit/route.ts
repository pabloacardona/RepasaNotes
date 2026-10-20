import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, quizzes } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getQuiz } from "@/lib/data";
import { submitQuizSchema, fieldErrors } from "@/lib/validators";

export async function POST(req: Request, ctx: RouteContext<"/api/quizzes/[id]/submit">) {
  const { session, error } = await requireApiUser();
  if (error) return error;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });
  }

  const parsed = submitQuizSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  const quiz = await getQuiz(session.sub, id);
  if (!quiz) return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });

  const answers = parsed.data.answers;
  if (answers.length !== quiz.questions.length) {
    return NextResponse.json({ error: "Faltan respuestas" }, { status: 400 });
  }

  // Score is computed on the server, never trusted from the client.
  const score = quiz.questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
    0,
  );

  await getDb()
    .update(quizzes)
    .set({ answers, score, completedAt: new Date() })
    .where(and(eq(quizzes.id, id), eq(quizzes.userId, session.sub)));

  return NextResponse.json({ score, total: quiz.total });
}
