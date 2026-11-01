"use client";

import { useEffect, useState } from "react";
import { celebrate } from "@/components/confetti";
import { gradeFor } from "@/lib/ranks";

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
  const win = pct >= 70;
  const grade = gradeFor(pct);

  // Count-up animation and confetti right after finishing a quiz.
  useEffect(() => {
    if (!fresh) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 1100;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = duration ? Math.min((now - start) / duration, 1) : 1;
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(score * eased));
      setShownPoints(Math.round(points * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else if (win) celebrate();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fresh, score, points, win]);

  const color = win ? "#ffe14d" : "#ff4d79";

  return (
    <div className="mt-2">
      <p
        className={`hx-title text-center text-4xl uppercase sm:text-5xl ${fresh ? "hx-banner" : ""}`}
        style={{ color, textShadow: `0 0 28px ${color}88` }}
      >
        {win ? "Victoria" : "Derrota"}
      </p>
      <div className="hx-rule my-3">
        <span />
      </div>
      <div className="flex items-center gap-5">
        <div
          className={`grid h-24 w-24 shrink-0 place-items-center font-display text-5xl font-black text-[var(--surface)] ${fresh ? "anim-pop" : ""}`}
          style={{
            clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
            background: `linear-gradient(160deg, ${grade.color}, #0a1428 150%)`,
            filter: `drop-shadow(0 0 14px ${grade.color}aa)`,
          }}
          aria-label={`Nota ${grade.letter}`}
        >
          {grade.letter}
        </div>
        <div className="min-w-0 flex-1">
          <p className="hx-mute text-xs font-bold uppercase tracking-widest">Aciertos</p>
          <p className="hx-title text-5xl tabular-nums" aria-label={`${score} de ${total}`}>
            {shown}
            <span className="hx-mute text-3xl">/{total}</span>
          </p>
          <div className={`hx-bar mt-1 ${win ? "hx-bar-gold" : "hx-bar-red"}`}>
            <span style={{ width: `${Math.max(total ? (shown / total) * 100 : 0, 3)}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Precisión" value={`${pct}%`} />
        <Stat label="Puntos" value={shownPoints.toLocaleString("es-CO")} />
        <Stat label="Mejor combo" value={bestStreak > 0 ? `🔥 ${bestStreak}` : "—"} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--fg)]/5 px-2 py-2">
      <p className="hx-title text-xl tabular-nums">{value}</p>
      <p className="hx-mute text-[0.6rem] font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}
