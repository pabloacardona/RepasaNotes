"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { celebrate } from "@/components/confetti";

export function ScoreCard({
  score,
  total,
  points,
  bestStreak,
  fresh,
}: {
  score: number;
  total: number;
  points: number;
  bestStreak: number;
  fresh: boolean;
}) {
  const pct = Math.round((score / total) * 100);
  const [shown, setShown] = useState(fresh ? 0 : score);
  const [shownPoints, setShownPoints] = useState(fresh ? 0 : points);

  // Count-up animation and confetti right after finishing a quiz.
  useEffect(() => {
    if (!fresh) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = duration ? Math.min((now - start) / duration, 1) : 1;
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(score * eased));
      setShownPoints(Math.round(points * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else if (pct >= 70) celebrate();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fresh, score, points, pct]);

  const verdict =
    pct === 100
      ? { emoji: "🏆", text: "¡Perfecto!" }
      : pct >= 90
        ? { emoji: "🌟", text: "¡Excelente!" }
        : pct >= 70
          ? { emoji: "🎉", text: "¡Muy bien!" }
          : pct >= 50
            ? { emoji: "💪", text: "Vas por buen camino" }
            : { emoji: "📚", text: "Toca repasar" };
  const tone = pct >= 70 ? "green" : pct >= 50 ? "yellow" : "red";
  const barColor = tone === "green" ? "bg-green" : tone === "yellow" ? "bg-yellow" : "bg-red";
  const textColor = tone === "green" ? "text-green" : tone === "yellow" ? "text-ink" : "text-red";

  return (
    <Card className="anim-rise overflow-hidden p-6">
      <div className="flex items-start justify-between">
        <p className="text-ink-soft">Tu puntaje</p>
        <span aria-hidden className={`text-4xl ${fresh ? "anim-pop" : ""}`}>
          {verdict.emoji}
        </span>
      </div>
      <p className="font-display text-6xl font-extrabold tabular-nums" aria-label={`${score} de ${total}`}>
        {shown}/{total}
      </p>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-paper-dark">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
          style={{ width: `${Math.max(total ? (shown / total) * 100 : 0, 3)}%` }}
        />
      </div>
      <p className={`mt-3 font-bold ${textColor}`}>
        {pct}% · {verdict.text}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 text-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Puntos</p>
          <p className="font-display text-2xl font-bold tabular-nums">{shownPoints.toLocaleString("es-CO")}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Mejor racha</p>
          <p className="font-display text-2xl font-bold">{bestStreak > 0 ? `🔥 ${bestStreak}` : "—"}</p>
        </div>
      </div>
    </Card>
  );
}
