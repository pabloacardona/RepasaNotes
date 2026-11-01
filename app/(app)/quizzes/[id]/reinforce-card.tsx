"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useState } from "react";
import { Spinner } from "@/components/ui";

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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 22 }}
      className="hx-panel p-5"
    >
      <p className="hx-kicker !text-[#f0d89a]">Recomendado</p>
      <h3 className="hx-title mt-1 text-xl">🎯 Entrena tus puntos débiles</h3>
      <p className="hx-mute mt-1 text-sm">
        La IA crea preguntas nuevas sobre {mistakes === 1 ? "el concepto que fallaste" : `los ${mistakes} conceptos que fallaste`}, desde otros ángulos.
      </p>
      <div className="mt-4 flex items-center gap-2" role="group" aria-label="Número de preguntas">
        {[5, 10].map((n) => (
          <button
            key={n}
            onClick={() => setCount(n)}
            aria-pressed={count === n}
            className={`whitespace-nowrap border px-3 py-1 text-sm font-bold transition ${
              count === n ? "border-[#f0d89a] bg-[#c8aa6e]/25 text-[#f0d89a]" : "border-white/15 bg-white/5 hover:bg-white/10"
            }`}
          >
            {n} preguntas
          </button>
        ))}
      </div>
      <button onClick={generate} disabled={loading} className="hx-btn hx-btn-gold mt-4 w-full">
        {loading ? <Spinner /> : <span aria-hidden>✨</span>}
        {loading ? "Creando preguntas…" : "Generar quiz de refuerzo"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-[#ff9aa8]">
          {error}
        </p>
      )}
    </motion.div>
  );
}
