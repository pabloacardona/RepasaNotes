import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getQuiz } from "@/lib/data";
import { AIGenerationError, generateHint } from "@/lib/ai";

// One AI hint for one question of an unfinished quiz. The client tracks lives; the answer is never sent back.
export async function POST(req: Request, ctx: RouteContext<"/api/quizzes/[id]/hint">) {
  const { session, error } = await requireApiUser();
  if (error) return error;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const index = Number(body?.index);
  const quiz = await getQuiz(session.sub, id);
  if (!quiz || quiz.completedAt || !Number.isInteger(index) || index < 0 || index >= quiz.questions.length) {
    return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 });
  }
  try {
    const hint = await generateHint(quiz.questions[index]);
    return NextResponse.json({ hint });
  } catch (err) {
    const message = err instanceof AIGenerationError ? err.message : "No se pudo generar la pista.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
