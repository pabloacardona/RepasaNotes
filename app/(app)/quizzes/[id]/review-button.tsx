"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Spinner } from "@/components/ui";

export function ReviewButton({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${quizId}/review`, { method: "POST" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setLoading(false);
      return setError(data.error ?? "No se pudo crear el repaso");
    }
    router.push(`/quiz/${data.quiz.id}`);
  }

  return (
    <>
      <Button variant="ai" onClick={review} disabled={loading} className="w-full">
        {loading ? <Spinner /> : <span aria-hidden>⚡</span>}
        Repasar errores
      </Button>
      {error && <p role="alert" className="text-sm font-bold text-red">{error}</p>}
    </>
  );
}
