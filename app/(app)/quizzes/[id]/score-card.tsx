"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { celebrate } from "@/components/confetti";
import { StreakFlame } from "@/components/game/streak-flame";
import { gradeFor } from "@/lib/ranks";

// Smooth count-up from 0 (or straight to the value when it is not a fresh result).
function useCount(to: number, fresh: boolean, delay = 0, duration = 1.1) {
  const [v, setV] = useState(fresh ? 0 : to);
  useEffect(() => {
    if (!fresh) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = animate(0, to, { duration: reduce ? 0.001 : duration, delay: reduce ? 0 : delay, ease: [0.16, 1, 0.3, 1], onUpdate: (n) => setV(n) });
    return () => c.stop();
  }, [to, fresh, delay, duration]);
  return v;
}

// One calm summary card: a score ring with the grade, the verdict and three small numbers.
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
  const reduce = useReducedMotion();
  const pct = total ? Math.round((score / total) * 100) : 0;
  // Passing starts at 50%: nobody "loses" a quiz. Below that the message is encouragement, not defeat.
  const win = pct >= 50;
  const grade = gradeFor(pct);
  const tone = win ? "var(--ok)" : "var(--hi)";
  const shownPct = useCount(pct, fresh, 0.2);
  const shownPoints = useCount(points, fresh, 0.35);
  const done = useRef(false);

  useEffect(() => {
    if (!fresh || !win || done.current) return;
    done.current = true;
    const t = setTimeout(celebrate, reduce ? 0 : 900);
    return () => clearTimeout(t);
  }, [fresh, win, reduce]);

  const R = 40;
  const C = 2 * Math.PI * R;
  const title = pct === 100 ? "¡Perfecto!" : win ? "Victoria" : "Sigue adelante";
  const verdict = pct === 100 ? "Sin un solo error" : pct >= 90 ? "Excelente trabajo" : pct >= 70 ? "Muy bien" : pct >= 50 ? "Aprobaste, sigue subiendo" : "Repasa lo fallado y vuelve a intentarlo";

  return (
    <div className="hx-panel flex items-center gap-4 p-4 sm:gap-5 sm:p-5">
      <div className="relative grid h-[104px] w-[104px] shrink-0 place-items-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--track)" strokeWidth="8" />
          <motion.circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={tone}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: reduce || !fresh ? C * (1 - pct / 100) : C }}
            animate={{ strokeDashoffset: C * (1 - pct / 100) }}
            transition={{ duration: 1.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="text-center leading-none" aria-label={`Nota ${grade.letter}, ${score} de ${total}`}>
          <p className="font-display text-4xl font-bold" style={{ color: grade.color }}>
            {grade.letter}
          </p>
          <p className="hx-mute mt-1 text-xs font-bold tabular-nums">
            {score}/{total}
          </p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <motion.p
          initial={reduce || !fresh ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-3xl font-bold leading-none sm:text-4xl"
          style={{ color: tone }}
        >
          {title}
        </motion.p>
        <p className="hx-mute mt-1 text-sm">{verdict}</p>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <div>
            <dd className="inline font-display text-lg font-bold tabular-nums">{Math.round(shownPct)}%</dd> <dt className="hx-mute inline">precisión</dt>
          </div>
          <div>
            <dd className="inline font-display text-lg font-bold tabular-nums">{Math.round(shownPoints).toLocaleString("es-CO")}</dd> <dt className="hx-mute inline">puntos</dt>
          </div>
          <div className="inline-flex items-center gap-1">
            <StreakFlame size={18} active={bestStreak > 0} days={1} />
            <dd className="font-display text-lg font-bold tabular-nums">{bestStreak || "—"}</dd> <dt className="hx-mute">combo</dt>
          </div>
        </dl>
      </div>
    </div>
  );
}
