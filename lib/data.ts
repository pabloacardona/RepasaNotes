import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getDb, notes, quizzes } from "./db";
import { buildTopicResolver } from "./topics";

/** Topics of all the notes of a user, one entry per note (repeats are the weight when topics are grouped). */
export async function listNoteTopics(userId: string) {
  const rows = await getDb().select({ topic: notes.topic }).from(notes).where(eq(notes.userId, userId));
  return rows.map((r) => r.topic);
}

export async function listNotes(userId: string) {
  return getDb()
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt));
}

export async function getNote(userId: string, id: string) {
  const [note] = await getDb()
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)));
  return note ?? null;
}

export async function getQuiz(userId: string, id: string) {
  const [quiz] = await getDb()
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, id), eq(quizzes.userId, userId)));
  return quiz ?? null;
}

export async function listQuizzes(userId: string) {
  return getDb()
    .select({
      id: quizzes.id,
      title: quizzes.title,
      topic: quizzes.topic,
      noteId: quizzes.noteId,
      difficulty: quizzes.difficulty,
      score: quizzes.score,
      total: quizzes.total,
      completedAt: quizzes.completedAt,
      createdAt: quizzes.createdAt,
    })
    .from(quizzes)
    .where(eq(quizzes.userId, userId))
    .orderBy(desc(quizzes.createdAt));
}

export type TopicStat = { topic: string; average: number; attempts: number };

export async function getStats(userId: string) {
  const db = getDb();
  const [done, noteRows] = await Promise.all([
    db
      .select({ topic: quizzes.topic, score: quizzes.score, total: quizzes.total })
      .from(quizzes)
      .where(and(eq(quizzes.userId, userId), isNotNull(quizzes.completedAt))),
    db.select({ id: notes.id, topic: notes.topic }).from(notes).where(eq(notes.userId, userId)),
  ]);
  // Same subject written two ways ("Desarrollo web" / "HTML y CSS") is one row, not two.
  const topicOf = buildTopicResolver([...done.map((q) => q.topic), ...noteRows.map((n) => n.topic)]);

  const byTopic = new Map<string, { sum: number; n: number }>();
  let sum = 0;
  for (const q of done) {
    const pct = q.total ? ((q.score ?? 0) / q.total) * 100 : 0;
    sum += pct;
    const key = topicOf(q.topic);
    const t = byTopic.get(key) ?? { sum: 0, n: 0 };
    t.sum += pct;
    t.n += 1;
    byTopic.set(key, t);
  }

  const topics: TopicStat[] = [...byTopic.entries()]
    .map(([topic, t]) => ({ topic, average: Math.round(t.sum / t.n), attempts: t.n }))
    .sort((a, b) => b.average - a.average);

  const weakest = topics.length ? topics[topics.length - 1] : null;

  return {
    quizzesDone: done.length,
    average: done.length ? Math.round(sum / done.length) : null,
    notesCount: noteRows.length,
    topics,
    weakest,
  };
}
