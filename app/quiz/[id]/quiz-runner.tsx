"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Spinner } from "@/components/ui";
import type { Question } from "@/lib/db/schema";

const LETTERS = ["A", "B", "C", "D"];

export function QuizRunner({
  id,
  title,
  topic,
  questions,
}: {
  id: string;
  title: string;
  topic: string;
  questions: Question[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = questions[current];
  const chosen = answers[current];
  const answered = chosen !== -1;
  const isLast = current === questions.length - 1;
  const answeredCount = answers.filter((a) => a !== -1).length;
  const progress = (answeredCount / questions.length) * 100;

  function choose(i: number) {
    if (answered) return;
    setAnswers((a) => a.map((v, idx) => (idx === current ? i : v)));
  }

  async function finish() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setSubmitting(false);
      return setError("No se pudieron guardar tus respuestas. Intenta de nuevo.");
    }
    router.push(`/quizzes/${id}`);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 sm:px-6">
          <span className="font-display text-2xl font-bold text-yellow">Repasa</span>
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/20"
            role="progressbar"
            aria-label="Progreso del quiz"
            aria-valuenow={answeredCount}
            aria-valuemin={0}
            aria-valuemax={questions.length}
          >
            <div className="h-full rounded-full bg-yellow transition-all" style={{ width: `${progress}%` }} />
          </div>
          <Link href="/quizzes" className="whitespace-nowrap text-white/85 hover:text-white">
            Salir del quiz
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted">
            {topic} · {title}
          </p>
          <p className="font-bold">
            Pregunta {current + 1} de {questions.length}
          </p>
        </div>

        <section className="rounded-2xl border border-line bg-card p-5 sm:p-6" aria-live="polite">
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{q.question}</h1>
          <ul className="mt-5 space-y-2.5">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex;
              const isChosen = i === chosen;
              let style = "border-line hover:border-blue hover:bg-blue-soft";
              let tag: React.ReactNode = null;
              if (answered) {
                if (isCorrect) {
                  style = "border-green bg-green-soft";
                  tag = <span className="font-bold text-green">✓ Correcta</span>;
                } else if (isChosen) {
                  style = "border-red bg-red-soft";
                  tag = <span className="font-bold text-red">✗ Incorrecta</span>;
                } else {
                  style = "border-line opacity-70";
                }
              }
              return (
                <li key={i}>
                  <button
                    onClick={() => choose(i)}
                    disabled={answered}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition disabled:cursor-default ${style}`}
                  >
                    <span className="font-display font-bold text-muted">{LETTERS[i]}</span>
                    <span className={`flex-1 ${answered && (isCorrect || isChosen) ? "font-bold" : ""}`}>{opt}</span>
                    {tag}
                  </button>
                </li>
              );
            })}
          </ul>

          {answered && (
            <div className="mt-5 rounded-lg border-l-4 border-yellow bg-yellow-soft px-4 py-3">
              <span className="font-bold">Explicación de la IA:</span> {q.explanation}
            </div>
          )}
        </section>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-soft px-3 py-2 font-bold text-red">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setCurrent((c) => c - 1)} disabled={current === 0}>
            Anterior
          </Button>
          {isLast ? (
            <Button onClick={finish} disabled={submitting || answeredCount < questions.length}>
              {submitting && <Spinner />}
              {answeredCount < questions.length
                ? `Faltan ${questions.length - answeredCount}`
                : "Ver resultados"}
            </Button>
          ) : (
            <Button onClick={() => setCurrent((c) => c + 1)}>Siguiente</Button>
          )}
        </div>
      </main>
    </div>
  );
}
