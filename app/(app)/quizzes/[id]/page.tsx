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
    dailyDone: before.today.answered < DAILY_GOAL && after.today.answered >= DAILY_GOAL,
  };
  const mistakes = quiz.questions
    .map((q, i) => ({ q, given: answers[i], n: i + 1 }))
    .filter(({ q, given }) => given !== q.correctIndex);
  const fresh = nuevo === "1";

  return (
    <>
      <ResultsWorld score={quiz.score} total={quiz.total} bestStreak={bestStreak} />
      {/* Landscape: pinned left with its own scroll, so the mascot and trophy stay visible on the right. */}
      <div className="hx-panel hx-panel-soft mt-[30dvh] max-w-[640px] landscape:fixed landscape:bottom-4 landscape:left-4 landscape:top-[4.75rem] landscape:z-10 landscape:mt-0 landscape:w-[min(620px,56vw)]">
        <div className="max-h-full overflow-y-auto overscroll-contain p-4 sm:p-6 landscape:h-full">
          <p className="hx-mute truncate text-sm">
            {quiz.topic} · {quiz.title}
          </p>
          <ScoreCard score={quiz.score} total={quiz.total} points={points} bestStreak={bestStreak} fresh={fresh} />

          <div className="mt-4 space-y-3">
            <RewardsCard reward={reward} fresh={fresh} />
            {mistakes.length > 0 && <ReinforceCard quizId={quiz.id} mistakes={mistakes.length} />}
            <div className="grid gap-2 sm:grid-cols-2">
              {mistakes.length > 0 && <ReviewButton quizId={quiz.id} mode="errors" label="Repetir falladas" />}
              <ReviewButton quizId={quiz.id} mode="all" label="Jugar de nuevo" />
            </div>
            <Link href="/dashboard" className="hx-btn w-full">
              Volver al inicio
            </Link>
          </div>

          <section className="mt-6">
            {mistakes.length === 0 ? (
              <div className="anim-rise border-l-2 border-[var(--ok)] bg-[var(--ok)]/10 p-5">
                <p className="hx-title text-xl text-[var(--ok)]">¡Sin errores! 🏆</p>
                <p className="mt-1">Dominas este apunte. Prueba con una dificultad mayor.</p>
              </div>
            ) : (
              <>
                <h2 className="hx-kicker mb-3">Revisa {mistakes.length === 1 ? "tu error" : `tus ${mistakes.length} errores`}</h2>
                <ul className="space-y-3">
                  {mistakes.map(({ q, given, n }, i) => (
                    <li key={n} className="anim-rise border-l-2 border-[var(--bad)] bg-[var(--fg)]/5 p-4" style={{ animationDelay: `${i * 80}ms` }}>
                      <p className="hx-mute text-xs font-bold uppercase tracking-widest">Pregunta {n}</p>
                      <p className="font-bold">{q.question}</p>
                      <p className="mt-2 text-sm">
                        <span className="font-bold text-[var(--bad-soft)]">Tu respuesta:</span>{" "}
                        <span className="text-[var(--bad-soft)]">{given >= 0 ? `${LETTERS[given]}. ${q.options[given]}` : "Sin responder"}</span>
                      </p>
                      <p className="mt-1 text-sm">
                        <span className="font-bold text-[var(--ok)]">Correcta:</span>{" "}
                        <span className="text-[var(--ok)]">
                          {LETTERS[q.correctIndex]}. {q.options[q.correctIndex]}
                        </span>
                      </p>
                      <p className="hx-mute mt-2 text-sm">{q.explanation}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
