import { NextResponse } from "next/server";
import { getDb, quizzes } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getNote, getQuiz } from "@/lib/data";
import { generateReinforcement, AIGenerationError } from "@/lib/ai";

export const maxDuration = 60;

// Generates a NEW quiz with AI that targets the concepts the user missed.
export async function POST(req: Request, ctx: RouteContext<"/api/quizzes/[id]/reinforce">) {
  const { session, error } = await requireApiUser();
  if (error) return error;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const count = [5, 10].includes(body?.count) ? (body.count as number) : 5;

  const quiz = await getQuiz(session.sub, id);
  if (!quiz || !quiz.answers) {
    return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });
  }

  const answers = quiz.answers;
  const missed = quiz.questions
    .map((q, i) => ({ q, given: answers[i] }))
    .filter(({ q, given }) => given !== q.correctIndex)
    .map(({ q, given }) => ({
      question: q.question,
      correct: q.options[q.correctIndex],
      given: given >= 0 ? q.options[given] : null,
    }));
  if (missed.length === 0) {
    return NextResponse.json({ error: "No tienes errores que reforzar" }, { status: 400 });
  }

  const note = quiz.noteId ? await getNote(session.sub, quiz.noteId) : null;
  const baseTitle = quiz.title.replace(/^(Repaso|Repetición|Refuerzo): /, "");

  try {
    const questions = await generateReinforcement({
      title: baseTitle,
      topic: quiz.topic,
      noteContent: note?.content ?? null,
      missed,
      count,
      difficulty: quiz.difficulty,
    });
    const [created] = await getDb()
      .insert(quizzes)
      .values({
        userId: session.sub,
        noteId: quiz.noteId,
        title: `Refuerzo: ${baseTitle}`,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        questions,
        total: questions.length,
      })
      .returning({ id: quizzes.id });
    return NextResponse.json({ quiz: created }, { status: 201 });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("reinforcement failed", err);
    return NextResponse.json({ error: "Error inesperado al generar el quiz" }, { status: 500 });
  }
}
