"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { celebrate } from "@/components/confetti";
import { StreakFlame } from "@/components/game/streak-flame";
import { gradeFor } from "@/lib/ranks";

// Smooth count-up from 0 (or straight to the value when it is not a fresh result).
function useCount(to: number, fresh: boolean, delay = 0, duration = 1.5) {
  const [v, setV] = useState(fresh ? 0 : to);
  useEffect(() => {
    if (!fresh) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = animate(0, to, { duration: reduce ? 0.001 : duration, delay: reduce ? 0 : delay, ease: [0.16, 1, 0.3, 1], onUpdate: (n) => setV(n) });
    return () => c.stop();
  }, [to, fresh, delay, duration]);
  return v;
}

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
  const win = pct >= 70;
  const grade = gradeFor(pct);
  const tone = win ? "#ffd400" : "#ff4d79";
  const shownScore = useCount(score, fresh, 0.35);
  const shownPct = useCount(pct, fresh, 0.35);
  const shownPoints = useCount(points, fresh, 0.6);
  const done = useRef(false);

  useEffect(() => {
    if (!fresh || !win || done.current) return;
    done.current = true;
    const t = setTimeout(celebrate, reduce ? 0 : 1500);
    return () => clearTimeout(t);
  }, [fresh, win, reduce]);

  const R = 70;
  const C = 2 * Math.PI * R;
  const verdict = pct === 100 ? "¡Perfecto!" : pct >= 90 ? "¡Excelente!" : pct >= 70 ? "¡Muy bien!" : pct >= 50 ? "Vas por buen camino" : "Toca repasar";

  return (
    <div className="relative mt-2 overflow-hidden rounded-2xl px-2 pb-1 pt-4" style={{ ["--c" as string]: tone, ["--g" as string]: tone }}>
      <span aria-hidden className="rank-rays !inset-[-70%] opacity-60" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40" style={{ background: `radial-gradient(60% 100% at 50% 0%, ${tone}44, transparent)` }} />

      <div className="relative text-center">
        <motion.p
          initial={reduce || !fresh ? false : { opacity: 0, y: 26, scale: 0.8, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 140, damping: 16 }}
          className="font-display text-6xl font-bold uppercase leading-none tracking-wider sm:text-7xl"
          style={{ color: tone, textShadow: `0 0 34px ${tone}99, 0 4px 0 rgba(0,0,0,.25)` }}
        >
          {win ? "Victoria" : "Derrota"}
        </motion.p>
        <motion.p initial={reduce || !fresh ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="hx-mute mt-1 text-lg">
          {verdict}
        </motion.p>
      </div>

      {/* Gauge */}
      <div className="relative mx-auto mt-4 grid h-[200px] w-[200px] place-items-center">
        <svg viewBox="0 0 180 180" className="absolute inset-0 -rotate-90" aria-hidden>
          <defs>
            <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={tone} />
              <stop offset="1" stopColor={win ? "#ff8a3d" : "#a28bff"} />
            </linearGradient>
          </defs>
          <circle cx="90" cy="90" r={R} fill="none" stroke="var(--track)" strokeWidth="12" />
          <motion.circle
            cx="90"
            cy="90"
            r={R}
            fill="none"
            stroke="url(#gauge)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: reduce || !fresh ? C * (1 - pct / 100) : C }}
            animate={{ strokeDashoffset: C * (1 - pct / 100) }}
            transition={{ duration: 1.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 8px ${tone})` }}
          />
        </svg>
        <motion.div
          initial={reduce || !fresh ? false : { scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 190, damping: 13, delay: 0.9 }}
          className="relative grid h-[104px] w-[104px] place-items-center rounded-3xl font-display text-6xl font-bold"
          style={{
            background: `linear-gradient(150deg, ${grade.color}, color-mix(in oklab, ${grade.color} 35%, #0a1020))`,
            color: "#0a1020",
            boxShadow: `0 0 34px ${grade.color}aa, inset 0 2px 0 rgba(255,255,255,.5)`,
          }}
          aria-label={`Nota ${grade.letter}`}
        >
          {grade.letter}
        </motion.div>
      </div>
      <p className="relative mt-1 text-center font-display text-4xl font-bold tabular-nums" aria-label={`${score} de ${total}`}>
        {Math.round(shownScore)}
        <span className="hx-mute text-2xl">/{total}</span>
      </p>

      <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
        <Tile label="Precisión" delay={0.5} fresh={fresh}>
          {Math.round(shownPct)}%
        </Tile>
        <Tile label="Puntos" delay={0.6} fresh={fresh}>
          {Math.round(shownPoints).toLocaleString("es-CO")}
        </Tile>
        <Tile label="Mejor combo" delay={0.7} fresh={fresh}>
          <span className="inline-flex items-center justify-center gap-1">
            <StreakFlame size={22} active={bestStreak > 0} days={1} />
            {bestStreak || "—"}
          </span>
        </Tile>
      </div>
    </div>
  );
}

function Tile({ label, children, delay, fresh }: { label: string; children: React.ReactNode; delay: number; fresh: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce || !fresh ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 + delay, type: "spring", stiffness: 200, damping: 20 }}
      className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/70 px-2 py-2.5 backdrop-blur"
    >
      <p className="font-display text-xl font-bold tabular-nums">{children}</p>
      <p className="hx-mute text-[0.65rem] font-bold uppercase tracking-widest">{label}</p>
    </motion.div>
  );
}
