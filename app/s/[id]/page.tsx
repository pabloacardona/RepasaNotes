import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, sharedQuizzes } from "@/lib/db";
import { SharedPlayer } from "./shared-player";

export const metadata: Metadata = { title: "Quiz compartido", robots: { index: false } };

// Public page: no login. Anyone with the link plays their own copy of the quiz.
export default async function SharedQuizPage({ params }: PageProps<"/s/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [row] = await getDb()
    .select({ id: sharedQuizzes.id, mode: sharedQuizzes.mode, title: sharedQuizzes.title, topic: sharedQuizzes.topic, count: sharedQuizzes.count })
    .from(sharedQuizzes)
    .where(eq(sharedQuizzes.id, id))
    .catch(() => []);
  if (!row) notFound();
  return <SharedPlayer id={row.id} mode={row.mode === "variant" ? "variant" : "fixed"} title={row.title} topic={row.topic} count={row.count} />;
}
