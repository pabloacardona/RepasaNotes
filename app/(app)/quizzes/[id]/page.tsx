import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getQuiz } from "@/lib/data";
import { Card, LinkButton } from "@/components/ui";
import { ReviewButton } from "./review-button";

export const metadata: Metadata = { title: "Resultados" };

const LETTERS = ["A", "B", "C", "D"];

export default async function ResultsPage({ params }: PageProps<"/quizzes/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireUser();
  const quiz = await getQuiz(user.sub, id);
  if (!quiz) notFound();
  if (!quiz.answers || quiz.score === null) redirect(`/quiz/${quiz.id}`);

  const pct = Math.round((quiz.score / quiz.total) * 100);
  const answers = quiz.answers;
  const mistakes = quiz.questions
    .map((q, i) => ({ q, given: answers[i] }))
    .filter(({ q, given }) => given !== q.correctIndex);

  const verdict =
    pct >= 90 ? "¡Excelente!" : pct >= 70 ? "¡Muy bien!" : pct >= 50 ? "Vas por buen camino" : "Toca repasar";
  const tone = pct >= 70 ? "green" : pct >= 50 ? "yellow" : "red";
  const barColor = tone === "green" ? "bg-green" : tone === "yellow" ? "bg-yellow" : "bg-red";
  const textColor = tone === "green" ? "text-green" : tone === "yellow" ? "text-ink" : "text-red";

  return (
    <>
      <p className="text-muted">
        {quiz.topic} · {quiz.title}
      </p>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Resultados del quiz</h1>

      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <div className="space-y-3">
          <Card className="p-6">
            <p className="text-ink-soft">Tu puntaje</p>
            <p className="font-display text-6xl font-extrabold">
              {quiz.score}/{quiz.total}
            </p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-paper-dark">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(pct, 3)}%` }} />
            </div>
            <p className={`mt-3 font-bold ${textColor}`}>
              {pct}% · {verdict}
            </p>
          </Card>
          {mistakes.length > 0 && <ReviewButton quizId={quiz.id} />}
          <LinkButton href="/dashboard" variant="outline" className="w-full">
            Volver al inicio
          </LinkButton>
        </div>

        <section>
          {mistakes.length === 0 ? (
            <Card className="border-green bg-green-soft p-6">
              <p className="font-display text-xl font-bold text-green">¡Sin errores!</p>
              <p className="mt-1">Dominas este apunte. Prueba con una dificultad mayor.</p>
            </Card>
          ) : (
            <>
              <h2 className="mb-3 text-xl font-bold">
                Revisa {mistakes.length === 1 ? "tu error" : `tus ${mistakes.length} errores`}
              </h2>
              <ul className="space-y-3">
                {mistakes.map(({ q, given }, i) => (
                  <li key={i} className="rounded-xl border border-line border-l-4 border-l-red bg-card p-5">
                    <p className="font-bold">{q.question}</p>
                    <p className="mt-2">
                      <span className="font-bold text-red">Tu respuesta:</span>{" "}
                      <span className="text-red">
                        {given >= 0 ? `${LETTERS[given]}. ${q.options[given]}` : "Sin responder"} · Incorrecta
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
    </>
  );
}
