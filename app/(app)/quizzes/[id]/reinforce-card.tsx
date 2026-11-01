"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui";

// One quiet row: train what you missed with a fresh AI quiz.
export function ReinforceCard({ quizId, mistakes }: { quizId: string; mistakes: number }) {
  const router = useRouter();
  const [count, setCount] = useState(mistakes > 3 ? 10 : 5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${quizId}/reinforce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setLoading(false);
      return setError(data.error ?? "No se pudo generar el quiz de refuerzo");
    }
    router.push(`/quiz/${data.quiz.id}`);
  }

  return (
    <div className="hx-panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold">🎯 Reforzar lo que fallaste</p>
          <p className="hx-mute text-xs">
            La IA crea preguntas nuevas sobre {mistakes === 1 ? "el concepto" : `los ${mistakes} conceptos`} que no dominaste.
          </p>
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Número de preguntas">
          {[5, 10].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              aria-pressed={count === n}
              className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${count === n ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <button onClick={generate} disabled={loading} className="hx-btn hx-btn-gold !px-4 !py-2 text-sm">
          {loading && <Spinner />}
          {loading ? "Creando…" : "Reforzar"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-[var(--bad-soft)]">
          {error}
        </p>
      )}
    </div>
  );
}
