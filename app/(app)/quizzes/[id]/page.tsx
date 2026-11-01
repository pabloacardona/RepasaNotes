import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getQuiz } from "@/lib/data";
import { scoreRun } from "@/lib/score";
import { getGameProfile } from "@/lib/game";
import { DAILY_GOAL } from "@/lib/gamification";
import { RewardsCard, type Reward } from "@/components/game/rewards-card";
import { Card, LinkButton } from "@/components/ui";
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
  const had = new Set(before.badges.filter((b) => b.unlocked).map((b) => b.id));
  const reward: Reward = {
    xpGain: after.xp - before.xp,
    fromLevel: { level: before.level.level, pct: before.level.pct, title: before.level.title },
    toLevel: { level: after.level.level, pct: after.level.pct, title: after.level.title, into: after.level.into, need: after.level.need },
    newBadges: after.badges.filter((b) => b.unlocked && !had.has(b.id)),
    dailyDone: before.today.answered < DAILY_GOAL && after.today.answered >= DAILY_GOAL,
  };
  const mistakes = quiz.questions
    .map((q, i) => ({ q, given: answers[i], n: i + 1 }))
    .filter(({ q, given }) => given !== q.correctIndex);

  return (
    <>
      <ResultsWorld score={quiz.score} total={quiz.total} bestStreak={bestStreak} />
      {/* Landscape: pinned left with its own scroll, so the mascot and trophy stay visible on the right. */}
      <div className="mt-[30dvh] max-w-[640px] rounded-3xl border border-white/50 bg-paper/80 p-4 shadow-2xl backdrop-blur-xl sm:p-6 landscape:fixed landscape:bottom-4 landscape:left-4 landscape:top-[4.75rem] landscape:z-10 landscape:mt-0 landscape:w-[min(600px,56vw)] landscape:overflow-y-auto landscape:overscroll-contain">
      <p className="text-muted">
        {quiz.topic} · {quiz.title}
      </p>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Resultados del quiz</h1>

      <div className="grid gap-6">
        <div className="space-y-3">
          <ScoreCard
            score={quiz.score}
            total={quiz.total}
            points={points}
            bestStreak={bestStreak}
            fresh={nuevo === "1"}
          />
          <RewardsCard reward={reward} fresh={nuevo === "1"} />
          {mistakes.length > 0 && <ReinforceCard quizId={quiz.id} mistakes={mistakes.length} />}
          {mistakes.length > 0 && <ReviewButton quizId={quiz.id} mode="errors" label="Repetir solo las falladas" />}
          <ReviewButton quizId={quiz.id} mode="all" />
          <LinkButton href="/dashboard" variant="outline" className="w-full">
            Volver al inicio
          </LinkButton>
        </div>

        <section>
          {mistakes.length === 0 ? (
            <Card className="anim-rise border-green bg-green-soft p-6">
              <p className="font-display text-xl font-bold text-green">¡Sin errores! 🏆</p>
              <p className="mt-1">Dominas este apunte. Prueba con una dificultad mayor.</p>
            </Card>
          ) : (
            <>
              <h2 className="mb-3 text-xl font-bold">
                Revisa {mistakes.length === 1 ? "tu error" : `tus ${mistakes.length} errores`}
              </h2>
              <ul className="space-y-3">
                {mistakes.map(({ q, given, n }, i) => (
                  <li
                    key={n}
                    className="anim-rise rounded-xl border border-line border-l-4 border-l-red bg-card p-5"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <p className="text-sm font-bold text-muted">Pregunta {n}</p>
                    <p className="font-bold">{q.question}</p>
                    <p className="mt-2">
                      <span className="font-bold text-red">Tu respuesta:</span>{" "}
                      <span className="text-red">
                        {given >= 0 ? `${LETTERS[given]}. ${q.options[given]} · Incorrecta` : "Sin responder"}
                      </span>
                    </p>
                    <p className="mt-1">
                      <span className="font-bold text-green">Correcta:</span>{" "}
                      <span className="text-green">
                        {LETTERS[q.correctIndex]}. {q.options[q.correctIndex]}
                      </span>
                    </p>
                    <p className="mt-2 text-ink-soft">{q.explanation}</p>
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
