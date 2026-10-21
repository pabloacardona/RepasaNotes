import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getQuiz } from "@/lib/data";
import { scoreRun } from "@/lib/score";
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
  const mistakes = quiz.questions
    .map((q, i) => ({ q, given: answers[i], n: i + 1 }))
    .filter(({ q, given }) => given !== q.correctIndex);

  return (
    <>
      <ResultsWorld score={quiz.score} total={quiz.total} bestStreak={bestStreak} />
      <div className="mt-[26vh] max-w-[640px] rounded-3xl md:mt-0 border border-white/50 bg-paper/75 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
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
