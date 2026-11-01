"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui";

export function ReviewButton({
  quizId,
  mode = "errors",
  label,
}: {
  quizId: string;
  mode?: "errors" | "all";
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${quizId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setLoading(false);
      return setError(data.error ?? "No se pudo crear el quiz");
    }
    router.push(`/quiz/${data.quiz.id}`);
  }

  return (
    <div>
      <button onClick={review} disabled={loading} className={`hx-btn w-full ${mode === "all" ? "hx-btn-cyan" : ""}`}>
        {loading ? <Spinner /> : <span aria-hidden>{mode === "errors" ? "⚡" : "↻"}</span>}
        {label ?? (mode === "errors" ? "Repasar errores" : "Repetir quiz")}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-sm font-bold text-[#ff9aa8]">
          {error}
        </p>
      )}
    </div>
  );
}
