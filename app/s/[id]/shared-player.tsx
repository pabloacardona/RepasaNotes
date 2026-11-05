"use client";

import { useState } from "react";
import Link from "next/link";
import { CalmBackdrop } from "@/components/world/calm-backdrop";
import { Spinner } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { QuizRunner } from "@/app/quiz/[id]/quiz-runner";
import type { Question } from "@/lib/db/schema";

export function SharedPlayer({ id, mode, title, topic, count }: { id: string; mode: "fixed" | "variant"; title: string; topic: string; count: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<{ title: string; topic: string; questions: Question[] } | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/share/${id}/play`, { method: "POST" }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    setLoading(false);
    if (!res || !res.ok || !data?.questions) return setError(data?.error ?? "No se pudo cargar el quiz. Intenta de nuevo.");
    setQuiz(data);
  }

  if (quiz) return <QuizRunner id={id} title={quiz.title} topic={quiz.topic} questions={quiz.questions} shared />;

  return (
    <div className="hx grid min-h-dvh place-items-center p-4">
      <CalmBackdrop />
      <div className="absolute right-3 top-3">
        <ThemeToggle />
      </div>
      <div className="hx-epic pop-in w-full max-w-md p-6 text-center sm:p-8">
        <p className="hx-kicker">Quiz compartido · {topic}</p>
        <h1 className="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
        <p className="hx-mute mt-2 text-sm">
          {count} preguntas · {mode === "variant" ? "Esta versión es solo tuya: la IA la escribe al empezar." : "El orden se mezcla para ti."}
        </p>
        <button onClick={start} disabled={loading} className="hx-btn hx-btn-gold mt-6 w-full !py-3 text-base">
          {loading && <Spinner />}
          {loading ? (mode === "variant" ? "Preparando tu quiz…" : "Cargando…") : "Empezar ▶"}
        </button>
        {error && (
          <p role="alert" className="mt-3 rounded-lg border-l-4 border-[var(--bad)] bg-[var(--bad)]/10 px-3 py-2 text-left text-sm font-bold text-[var(--bad)]">
            {error}
          </p>
        )}
        <p className="mt-5 text-xs">
          <Link href="/" className="hx-mute underline-offset-4 hover:underline">
            Hecho con Repasa
          </Link>
        </p>
      </div>
    </div>
  );
}
