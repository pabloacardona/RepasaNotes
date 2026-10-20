"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Spinner } from "@/components/ui";

export function ReviewButton({ quizId, mode = "errors" }: { quizId: string; mode?: "errors" | "all" }) {
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
    <>
      <Button
        variant={mode === "errors" ? "ai" : "primary"}
        onClick={review}
        disabled={loading}
        className="w-full"
      >
        {loading ? <Spinner /> : <span aria-hidden>{mode === "errors" ? "⚡" : "↻"}</span>}
        {mode === "errors" ? "Repasar errores" : "Repetir quiz"}
      </Button>
      {error && <p role="alert" className="text-sm font-bold text-red">{error}</p>}
    </>
  );
}
