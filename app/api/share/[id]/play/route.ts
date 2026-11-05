import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, sharedQuizzes } from "@/lib/db";
import { AIGenerationError, generateQuestions } from "@/lib/ai";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { shuffleQuiz } from "@/lib/shuffle";

export const maxDuration = 60;

// Public: anyone with the link gets a quiz of their own. No account needed.
export async function POST(req: Request, ctx: RouteContext<"/api/share/[id]/play">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });

  const [row] = await getDb().select().from(sharedQuizzes).where(eq(sharedQuizzes.id, id));
  if (!row) return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });

  const ip = clientIp(req);
  if (row.mode === "variant" && !rateLimit(`play:${ip}`, 4, 10 * 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos seguidos. Espera unos minutos." }, { status: 429 });
  }

  try {
    const questions =
      row.mode === "variant" && row.noteContent
        ? shuffleQuiz(
            await generateQuestions({
              title: row.title,
              topic: row.topic,
              content: row.noteContent,
              count: row.count,
              difficulty: row.difficulty,
              variation: true,
            }),
          )
        : shuffleQuiz(row.questions);
    await getDb().update(sharedQuizzes).set({ plays: sql`${sharedQuizzes.plays} + 1` }).where(eq(sharedQuizzes.id, id));
    return NextResponse.json({ title: row.title, topic: row.topic, questions });
  } catch (err) {
    const message = err instanceof AIGenerationError ? err.message : "No se pudo preparar el quiz.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
