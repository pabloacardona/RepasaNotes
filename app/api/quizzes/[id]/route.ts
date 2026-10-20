import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getQuiz } from "@/lib/data";

export async function GET(_req: Request, ctx: RouteContext<"/api/quizzes/[id]">) {
  const { session, error } = await requireApiUser();
  if (error) return error;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });
  }
  const quiz = await getQuiz(session.sub, id);
  if (!quiz) return NextResponse.json({ error: "Quiz no encontrado" }, { status: 404 });
  return NextResponse.json({ quiz });
}
