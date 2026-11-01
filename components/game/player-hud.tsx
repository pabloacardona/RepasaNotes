"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RankEmblem } from "./rank-emblem";
import { StreakFlame } from "./streak-flame";

export type HudData = {
  rank: { tierIndex: number; division: number | null; label: string; pct: number; toNext: number; nextLabel: string | null; xp: number; color: string };
  streak: { current: number; best: number; activeToday: boolean };
  today: { answered: number; goal: number };
  week: { date: string; count: number }[];
  stats: { accuracy: number | null; answered: number; quizzes: number };
};

const MILESTONES = [3, 7, 14, 30, 60, 100];
const DAY = ["L", "M", "X", "J", "V", "S", "D"];

// Hours and minutes left in the Colombia day (UTC-5, no daylight saving).
function leftToday() {
  const ms = 24 * 3600 * 1000 - ((Date.now() - 5 * 3600 * 1000) % (24 * 3600 * 1000));
  return { h: Math.floor(ms / 3600000), m: Math.floor((ms % 3600000) / 60000) };
}

// Always-visible progress bar under the top nav: rank, XP, streak and today's goal, with a panel of stats on click.
export function PlayerHud({ rank, streak, today, week, stats }: HudData) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState<{ h: number; m: number } | null>(null);

  useEffect(() => {
    const tick = () => setLeft(leftToday());
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const atRisk = streak.current > 0 && !streak.activeToday;
  const goalPct = Math.min(100, Math.round((today.answered / today.goal) * 100));
  const almost = rank.pct >= 80;
  const nextMilestone = MILESTONES.find((m) => m > streak.current) ?? null;
  const max = Math.max(1, ...week.map((d) => d.count));

  return (
    <div className="hx-hud relative text-ink">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-1.5 sm:gap-5 sm:px-6">
        {/* Rank + XP */}
        <Link href="/logros" className="group flex min-w-0 flex-1 items-center gap-2 sm:gap-3" aria-label={`Rango ${rank.label}`}>
          <span className="shrink-0 transition-transform duration-150 group-hover:scale-110">
            <RankEmblem tierIndex={rank.tierIndex} division={rank.division} size={46} effects={false} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="tier-text truncate font-display font-bold text-[0.6rem]" style={{ ["--tc2" as string]: rank.color }}>
                {rank.label}
              </span>
              <span className={`shrink-0 text-sm ${almost ? "hx-blink font-bold text-[var(--hi)]" : "hx-mute"}`}>
                {rank.nextLabel ? (almost ? `¡Casi! ${rank.toNext} XP` : `${rank.toNext} XP → ${rank.nextLabel}`) : "MAX"}
              </span>
            </span>
            <span className="hx-bar mt-1 block !h-3.5">
              <span style={{ width: `${Math.max(rank.pct, 4)}%` }} />
            </span>
          </span>
        </Link>

        {/* Streak */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Ver racha y estadísticas"
          className={`flex shrink-0 items-center gap-2 rounded-xl border-2 px-2.5 py-1 transition hover:brightness-125 ${
            atRisk ? "border-[var(--bad)] bg-[var(--bad)]/15" : streak.activeToday ? "border-[var(--hot)] bg-[var(--hot)]/15" : "border-[var(--line)]"
          }`}
        >
          <StreakFlame size={30} active={streak.activeToday || atRisk} days={streak.current} />
          <span className="text-left leading-none">
            <span className="block font-display font-bold text-sm">{streak.current}</span>
            <span className={`block text-xs ${atRisk ? "hx-blink font-bold text-[var(--bad)]" : "hx-mute"}`}>
              {atRisk && left ? `${left.h}h ${left.m}m` : streak.activeToday ? "asegurada" : "días"}
            </span>
          </span>
          <span aria-hidden className={`hidden text-xs transition-transform sm:block ${open ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>

        {/* Daily goal */}
        <div className="hidden w-28 shrink-0 md:block" title={`Meta de hoy: ${today.answered}/${today.goal} preguntas`}>
          <p className="flex justify-between text-xs">
            <span className="hx-mute">HOY</span>
            <span className={goalPct >= 100 ? "font-bold text-[var(--ok)]" : ""}>
              {Math.min(today.answered, today.goal)}/{today.goal}
            </span>
          </p>
          <span className={`hx-bar mt-0.5 block !h-3 ${goalPct >= 100 ? "" : "hx-bar-gold"}`}>
            <span style={{ width: `${Math.max(goalPct, 4)}%` }} />
          </span>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="absolute inset-x-0 top-full z-30 px-3 sm:px-6"
          >
            <div className="hx-panel mx-auto mt-2 grid max-w-6xl gap-5 p-4 sm:grid-cols-[1.1fr_1fr_1fr] sm:p-5">
              {/* Week */}
              <div>
                <p className="hx-kicker">Esta semana</p>
                <div className="mt-3 flex h-24 items-end gap-2" role="img" aria-label="Preguntas respondidas por día">
                  {week.map((d, i) => {
                    const h = d.count === 0 ? 6 : Math.max(14, Math.round((d.count / max) * 96));
                    const last = i === week.length - 1;
                    return (
                      <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.count} respuestas`}>
                        <motion.span
                          initial={reduce ? false : { height: 0 }}
                          animate={{ height: h }}
                          transition={{ type: "spring", stiffness: 200, damping: 18, delay: i * 0.05 }}
                          className={`block w-full rounded-md border border-[var(--line-strong)] ${d.count > 0 ? "bg-[var(--hot)]" : "bg-[var(--track)]"} ${last ? "outline outline-2 outline-[var(--neon)]" : ""}`}
                        />
                        <span className="hx-mute text-xs">{DAY[(new Date(`${d.date}T12:00:00Z`).getUTCDay() + 6) % 7]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Streak milestones */}
              <div>
                <p className="hx-kicker">Racha</p>
                <p className="mt-2 flex items-center gap-2">
                  <StreakFlame size={34} active={streak.activeToday || atRisk} days={streak.current} />
                  <span>
                    <b className="font-display font-bold text-sm">{streak.current}</b> {streak.current === 1 ? "día" : "días"} · mejor {streak.best}
                  </span>
                </p>
                <ol className="mt-3 flex items-center gap-1.5" aria-label="Hitos de racha">
                  {MILESTONES.map((m) => {
                    const done = streak.current >= m;
                    return (
                      <li key={m} className={`grid h-9 flex-1 place-items-center rounded-lg border-2 text-sm font-bold ${done ? "border-[var(--hot)] bg-[var(--hot)] text-[#1a1c2c]" : "border-[var(--line)] hx-mute"}`}>
                        {m}
                      </li>
                    );
                  })}
                </ol>
                <p className="hx-mute mt-2 text-sm">
                  {atRisk && left ? `¡Responde algo en ${left.h}h ${left.m}m para no perderla!` : nextMilestone ? `Faltan ${nextMilestone - streak.current} días para el hito de ${nextMilestone}.` : "¡Todos los hitos logrados!"}
                </p>
              </div>

              {/* Stats */}
              <div>
                <p className="hx-kicker">Estadísticas</p>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-center sm:grid-cols-1 sm:text-left">
                  {[
                    ["Precisión", stats.accuracy === null ? "—" : `${stats.accuracy}%`],
                    ["Respondidas", stats.answered.toLocaleString("es-CO")],
                    ["Quizzes", `${stats.quizzes}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-2 border-b-2 border-dotted border-[var(--line)] pb-1">
                      <dt className="hx-mute">{k}</dt>
                      <dd className="font-display font-bold text-xs">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Link href="/logros" className="hx-btn mt-3 w-full !py-2" onClick={() => setOpen(false)}>
                  Ver rangos y logros
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
