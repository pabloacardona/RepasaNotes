import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb, sharedQuizzes } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getNote, getQuiz } from "@/lib/data";

// The link that goes into the QR must open for anyone. The address the owner is browsing from can be a protected
// deployment alias (Vercel sends visitors without a Vercel login to its sign-in page, and the quiz never starts), so
// when the production domain is known the QR always points there.
function publicUrl(req: Request, path: string) {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin = prod ? `https://${prod}` : new URL(req.url).origin;
  return `${origin}${path}`;
}

// Publishes one of the user's quizzes as a link. mode "fixed": same questions for all (shuffled per visitor).
// mode "variant": the AI writes a different quiz for each visitor from the same note.
// Sharing the same quiz in the same mode again returns the link that already exists (and its play count), so the QR
// that was printed or projected yesterday keeps working and the links do not pile up.
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

  const title = quiz.title.replace(/^(Repaso|Repetición): /, "");
  const db = getDb();

  const sameTitle = await db
    .select()
    .from(sharedQuizzes)
    .where(and(eq(sharedQuizzes.userId, session.sub), eq(sharedQuizzes.mode, mode), eq(sharedQuizzes.title, title)))
    .orderBy(desc(sharedQuizzes.createdAt));
  const questionsKey = JSON.stringify(quiz.questions);
  const existing = sameTitle.find((row) => JSON.stringify(row.questions) === questionsKey && (mode === "fixed" || row.noteContent === noteContent));
  if (existing) {
    return NextResponse.json({ id: existing.id, path: `/s/${existing.id}`, url: publicUrl(req, `/s/${existing.id}`), plays: existing.plays, reused: true });
  }

  const [created] = await db
    .insert(sharedQuizzes)
    .values({
      userId: session.sub,
      mode,
      title,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      count: quiz.questions.length,
      questions: quiz.questions,
      noteContent,
    })
    .returning({ id: sharedQuizzes.id });

  return NextResponse.json({ id: created.id, path: `/s/${created.id}`, url: publicUrl(req, `/s/${created.id}`), plays: 0, reused: false }, { status: 201 });
}
