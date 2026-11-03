import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getQuiz } from "@/lib/data";
import { scoreRun } from "@/lib/score";
import { getGameProfile } from "@/lib/game";
import { ACHIEVEMENTS, DAILY_GOAL } from "@/lib/gamification";
import { RewardsCard, type Reward } from "@/components/game/rewards-card";
import { ReviewButton } from "./review-button";
import { ScoreCard } from "./score-card";
import { ReinforceCard } from "./reinforce-card";
import { ResultsWorld } from "./results-world";

export const metadata: Metadata = { title: "Resultados" };

const LETTERS = ["A", "B", "C", "D"];

export default async function ResultsPage({ params, searchParams }: PageProps<"/quizzes/[id]">) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireUser();
  const quiz = await getQuiz(user.sub, id);
  if (!quiz) notFound();
  if (!quiz.answers || quiz.score === null) redirect(`/quiz/${quiz.id}`);

  const answers = quiz.answers;
  const { points, bestStreak } = scoreRun(
    answers,
    quiz.questions.map((q) => q.correctIndex),
  );
  // What this quiz earned: the profile with it, against the profile without it.
  const [before, after] = await Promise.all([
    getGameProfile(user.sub, { excludeQuizId: quiz.id }),
    getGameProfile(user.sub),
  ]);
  const hadTier = new Map(before.achievements.map((a) => [a.id, a.tier]));
  const lite = (r: typeof after.rank) => ({ tierIndex: r.tierIndex, division: r.division, label: r.label, pct: r.pct, toNext: r.toNext });
  const reward: Reward = {
    xpGain: after.xp - before.xp,
    from: lite(before.rank),
    to: lite(after.rank),
    promoted: after.rank.xp > before.rank.xp && after.rank.label !== before.rank.label,
    unlocked: after.achievements
      .filter((a) => a.tier > (hadTier.get(a.id) ?? 0))
      .map((a) => {
        const def = ACHIEVEMENTS.find((d) => d.id === a.id)!;
        return { id: a.id, emoji: a.emoji, name: a.name, tier: a.tier, text: def.text(def.goals[a.tier - 1]), rarity: a.rarity };
      }),
    questsDone: !before.questsBonus.claimed && after.questsBonus.claimed,
    dailyDone: before.today.answered < DAILY_GOAL && after.today.answered >= DAILY_GOAL,
  };
  const mistakes = quiz.questions
    .map((q, i) => ({ q, given: answers[i], n: i + 1 }))
    .filter(({ q, given }) => given !== q.correctIndex);
  const fresh = nuevo === "1";

  return (
    <>
      <ResultsWorld score={quiz.score} total={quiz.total} bestStreak={bestStreak} />
      <div className="mx-auto w-full max-w-[540px] space-y-3">
        <p className="hx-mute truncate text-center text-sm">
          {quiz.topic} · {quiz.title}
        </p>
        <ScoreCard score={quiz.score} total={quiz.total} points={points} bestStreak={bestStreak} fresh={fresh} />
        <RewardsCard reward={reward} fresh={fresh} />
        {mistakes.length > 0 && <ReinforceCard quizId={quiz.id} mistakes={mistakes.length} />}

        <div className="grid gap-2 sm:grid-cols-2">
          <ReviewButton quizId={quiz.id} mode="all" label="Jugar de nuevo" />
          {mistakes.length > 0 ? <ReviewButton quizId={quiz.id} mode="errors" label="Repetir las falladas" /> : <Link href="/dashboard" className="hx-btn">Volver al inicio</Link>}
        </div>
        {mistakes.length > 0 && (
          <p className="text-center">
            <Link href="/dashboard" className="hx-mute text-sm font-semibold underline-offset-4 hover:underline">
              Volver al inicio
            </Link>
          </p>
        )}

        {mistakes.length === 0 ? (
          <p className="rounded-xl border border-[var(--ok)]/40 bg-[var(--ok)]/10 px-4 py-3 text-center text-sm font-semibold text-[var(--ok)]">Sin errores. Prueba con una dificultad mayor. 🏆</p>
        ) : (
          <details className="group rounded-xl border border-[var(--line)] bg-[var(--surface)]/70">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
              <span>Revisar {mistakes.length === 1 ? "el error" : `los ${mistakes.length} errores`}</span>
              <span aria-hidden className="text-xs transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            <ul className="space-y-3 border-t border-[var(--line)] p-4">
              {mistakes.map(({ q, given, n }) => (
                <li key={n} className="text-sm">
                  <p className="hx-mute text-xs font-bold uppercase tracking-widest">Pregunta {n}</p>
                  <p className="font-semibold">{q.question}</p>
                  <p className="mt-1">
                    <span className="text-[var(--bad)]">✗ {given >= 0 ? `${LETTERS[given]}. ${q.options[given]}` : "Sin responder"}</span>
                  </p>
                  <p>
                    <span className="text-[var(--ok)]">
                      ✓ {LETTERS[q.correctIndex]}. {q.options[q.correctIndex]}
                    </span>
                  </p>
                  <p className="hx-mute mt-1">{q.explanation}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </>
  );
}
