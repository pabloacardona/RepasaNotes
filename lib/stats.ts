import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { getDb, quizzes } from "./db";

// Study statistics built from finished quizzes. Days are counted in Colombia time.
const TZ = "America/Bogota";
export const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD

export const HEATMAP_WEEKS = 12;
export const WEEK_BARS = 8;

export type Tally = { answered: number; correct: number; wrong: number; skipped: number; quizzes: number };
export type TopicTally = Tally & { topic: string };
export type Day = { date: string; count: number };
export type Week = { start: string; count: number };

const empty = (): Tally => ({ answered: 0, correct: 0, wrong: 0, skipped: 0, quizzes: 0 });

export function addDays(key: string, n: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
// Monday of the week that contains `key`.
function weekStart(key: string) {
  const dow = (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(key, -dow);
}

export async function getStudyStats(userId: string, now = new Date()) {
  const rows = await getDb()
    .select({ noteId: quizzes.noteId, topic: quizzes.topic, questions: quizzes.questions, answers: quizzes.answers, completedAt: quizzes.completedAt })
    .from(quizzes)
    .where(and(eq(quizzes.userId, userId), isNotNull(quizzes.completedAt)));

  const total = empty();
  const byTopic = new Map<string, Tally>();
  const byNote = new Map<string, Tally>();
  const perDay = new Map<string, number>();

  for (const r of rows) {
    const t = empty();
    t.quizzes = 1;
    r.questions.forEach((q, i) => {
      const a = r.answers?.[i] ?? -1;
      if (a === -1) t.skipped += 1;
      else {
        t.answered += 1;
        if (a === q.correctIndex) t.correct += 1;
        else t.wrong += 1;
      }
    });
    for (const [map, key] of [[byTopic, r.topic], [byNote, r.noteId]] as const) {
      if (!key) continue;
      const acc = map.get(key) ?? empty();
      acc.answered += t.answered;
      acc.correct += t.correct;
      acc.wrong += t.wrong;
      acc.skipped += t.skipped;
      acc.quizzes += 1;
      map.set(key, acc);
    }
    total.answered += t.answered;
    total.correct += t.correct;
    total.wrong += t.wrong;
    total.skipped += t.skipped;
    total.quizzes += 1;
    const day = dayKey(r.completedAt!);
    perDay.set(day, (perDay.get(day) ?? 0) + t.answered);
  }

  const today = dayKey(now);

  // Streaks: consecutive days with at least one answered question.
  let current = 0;
  for (let d = perDay.has(today) ? today : addDays(today, -1); perDay.get(d); d = addDays(d, -1)) current += 1;
  let best = 0;
  let run = 0;
  let prev = "";
  for (const d of [...perDay.keys()].filter((k) => perDay.get(k)! > 0).sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }

  // Heatmap: full weeks (Mon..Sun) ending with the current week.
  const firstDay = addDays(weekStart(today), -7 * (HEATMAP_WEEKS - 1));
  const heatmap: Day[] = [];
  for (let i = 0; i < HEATMAP_WEEKS * 7; i++) {
    const date = addDays(firstDay, i);
    heatmap.push({ date, count: date > today ? -1 : (perDay.get(date) ?? 0) });
  }

  const weeks: Week[] = [];
  for (let w = WEEK_BARS - 1; w >= 0; w--) {
    const start = addDays(weekStart(today), -7 * w);
    let count = 0;
    for (let i = 0; i < 7; i++) count += perDay.get(addDays(start, i)) ?? 0;
    weeks.push({ start, count });
  }

  let active30 = 0;
  for (let i = 0; i < 30; i++) if (perDay.get(addDays(today, -i))) active30 += 1;
  const activeDays = [...perDay.values()].filter((v) => v > 0).length;

  const topics: TopicTally[] = [...byTopic.entries()]
    .map(([topic, t]) => ({ topic, ...t }))
    .sort((a, b) => b.answered - a.answered);

  return {
    total,
    accuracy: total.answered ? Math.round((total.correct / total.answered) * 100) : null,
    streak: { current, best, activeToday: perDay.has(today) },
    active30,
    perActiveDay: activeDays ? Math.round(total.answered / activeDays) : 0,
    thisWeek: weeks[weeks.length - 1].count,
    lastWeek: weeks[weeks.length - 2].count,
    topics,
    byNote: Object.fromEntries(byNote),
    heatmap,
    weeks,
    today,
  };
}

export type StudyStats = Awaited<ReturnType<typeof getStudyStats>>;
