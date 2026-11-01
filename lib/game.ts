import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { getDb, notes, quizzes } from "./db";
import { addDays, dayKey } from "./stats";
import { scoreRun } from "./score";
import { rankFromXp, topicMastery } from "./ranks";
import {
  DAILY_BONUS_XP,
  DAILY_GOAL,
  dailyQuests,
  evaluateAchievements,
  xpForQuiz,
  type Facts,
} from "./gamification";

// Player profile derived from finished quizzes. `excludeQuizId` rebuilds the profile as it was before one quiz,
// which is how the results page works out what that quiz earned.
export async function getGameProfile(userId: string, opts: { excludeQuizId?: string; now?: Date } = {}) {
  const db = getDb();
  const [rows, noteRows] = await Promise.all([
    db
      .select({
        id: quizzes.id,
        topic: quizzes.topic,
        difficulty: quizzes.difficulty,
        questions: quizzes.questions,
        answers: quizzes.answers,
        score: quizzes.score,
        total: quizzes.total,
        completedAt: quizzes.completedAt,
      })
      .from(quizzes)
      .where(and(eq(quizzes.userId, userId), isNotNull(quizzes.completedAt))),
    db.select({ id: notes.id }).from(notes).where(eq(notes.userId, userId)),
  ]);

  const today = dayKey(opts.now ?? new Date());
  const perDay = new Map<string, { answered: number; correct: number; quizzes: number }>();
  const topicTally = new Map<string, { answered: number; correct: number }>();
  let xp = 0;
  let correct = 0;
  let perfect = 0;
  let hardWins = 0;
  let bestCombo = 0;
  let quizCount = 0;

  for (const r of rows) {
    if (r.id === opts.excludeQuizId) continue;
    const answers = r.answers ?? [];
    const { points, bestStreak } = scoreRun(
      answers,
      r.questions.map((q) => q.correctIndex),
    );
    const score = r.score ?? 0;
    xp += xpForQuiz(points, score, r.total);
    quizCount += 1;
    correct += score;
    bestCombo = Math.max(bestCombo, bestStreak);
    if (r.total > 0 && score === r.total) perfect += 1;
    if (r.difficulty === "dificil" && r.total > 0 && score / r.total >= 0.7) hardWins += 1;
    const tt = topicTally.get(r.topic) ?? { answered: 0, correct: 0 };
    tt.answered += answers.filter((a) => a !== -1).length;
    tt.correct += score;
    topicTally.set(r.topic, tt);

    const key = dayKey(r.completedAt!);
    const d = perDay.get(key) ?? { answered: 0, correct: 0, quizzes: 0 };
    d.answered += answers.filter((a) => a !== -1).length;
    d.correct += score;
    d.quizzes += 1;
    perDay.set(key, d);
  }

  // Daily goal bonus.
  for (const d of perDay.values()) if (d.answered >= DAILY_GOAL) xp += DAILY_BONUS_XP;

  // Day streaks.
  const active = (k: string) => (perDay.get(k)?.answered ?? 0) > 0;
  let streak = 0;
  for (let k = active(today) ? today : addDays(today, -1); active(k); k = addDays(k, -1)) streak += 1;
  let bestStreakDays = 0;
  let run = 0;
  let prev = "";
  for (const k of [...perDay.keys()].filter(active).sort()) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    bestStreakDays = Math.max(bestStreakDays, run);
    prev = k;
  }

  const rank = rankFromXp(xp);
  const topics = [...topicTally.entries()]
    .map(([topic, t]) => ({ topic, ...t, mastery: topicMastery(t.correct, t.answered) }))
    .sort((a, b) => b.mastery.points - a.mastery.points);
  const facts: Facts = {
    quizzes: quizCount,
    notes: noteRows.length,
    correct,
    perfect,
    hardWins,
    bestCombo,
    bestStreakDays,
    topics: topics.length,
    conquered: topics.filter((t) => t.mastery.conquered).length,
    rankTier: rank.tierIndex,
  };
  const achievements = evaluateAchievements(facts);
  const todayStats = perDay.get(today) ?? { answered: 0, correct: 0, quizzes: 0 };
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, count: perDay.get(date)?.answered ?? 0 };
  });

  return {
    xp,
    rank,
    topics,
    streak: { current: streak, best: bestStreakDays, activeToday: active(today) },
    achievements,
    achievementPoints: achievements.reduce((n, a) => n + a.points, 0),
    quests: dailyQuests(todayStats),
    today: todayStats,
    week,
    facts,
  };
}

export type GameProfile = Awaited<ReturnType<typeof getGameProfile>>;
