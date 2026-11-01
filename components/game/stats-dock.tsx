"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { celebrate } from "@/components/confetti";
import { StreakFlame } from "./streak-flame";
import { DAY_LETTER, DAY_NAME, MILESTONES, dayIndex, leftToday, type HudData } from "./hud-utils";

type Seg = "streak" | "week" | "accuracy" | "answered" | "quizzes" | "today";

// Permanent compact bar at the bottom of the screen with the streak and the stats. Every block is a button:
// tapping it opens a small card with the detail; the chevron folds the whole bar down to a pill.
export function StatsDock({ streak, today, week, stats }: HudData) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<Seg | null>(null);
  const [day, setDay] = useState(week.length - 1);
  const [folded, setFolded] = useState(false);
  const [left, setLeft] = useState<{ h: number; m: number } | null>(null);

  useEffect(() => {
    let saved = false;
    try {
      saved = localStorage.getItem("repasa_dock") === "folded";
    } catch {}
    const t0 = setTimeout(() => {
      setFolded(saved);
      setLeft(leftToday());
    }, 0);
    const t = setInterval(() => setLeft(leftToday()), 30000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function fold(v: boolean) {
    setFolded(v);
    setOpen(null);
    try {
      localStorage.setItem("repasa_dock", v ? "folded" : "open");
    } catch {}
  }
  const toggle = (s: Seg) => setOpen((o) => (o === s ? null : s));

  const atRisk = streak.current > 0 && !streak.activeToday;
  const goalPct = Math.min(100, Math.round((today.answered / today.goal) * 100));
  const max = Math.max(1, ...week.map((d) => d.count));
  const next = MILESTONES.find((m) => m > streak.current) ?? null;
  const prev = [...MILESTONES].reverse().find((m) => m <= streak.current) ?? 0;
  const mPct = next ? Math.round(((streak.current - prev) / (next - prev)) * 100) : 100;
  const d = week[day];
  const spring = { type: "spring" as const, stiffness: 320, damping: 30 };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-2 sm:pb-3">
      <AnimatePresence mode="wait" initial={false}>
        {folded ? (
          <motion.button
            key="pill"
            type="button"
            onClick={() => fold(false)}
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 14, scale: 0.9 }}
            transition={spring}
            className="hx-dock pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1.5"
            aria-label="Mostrar la barra de racha y estadísticas"
          >
            <StreakFlame size={24} active={streak.activeToday || atRisk} days={streak.current} />
            <span className="font-display font-bold">{streak.current}</span>
            <span className="hx-mute text-xs">▲</span>
          </motion.button>
        ) : (
          <motion.div
            key="dock"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 24 }}
            transition={spring}
            className="relative w-full max-w-4xl"
          >
            {/* Detail card */}
            <AnimatePresence>
              {open && (
                <motion.div
                  key={open}
                  initial={reduce ? false : { opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
                  transition={spring}
                  className="hx-dock pointer-events-auto absolute inset-x-0 bottom-full mb-2 rounded-2xl p-4"
                  role="region"
                  aria-live="polite"
                >
                  {open === "streak" && (
                    <div>
                      <p className="hx-kicker">Racha</p>
                      <p className="mt-1 text-lg">
                        <b className="font-display">{streak.current}</b> {streak.current === 1 ? "día" : "días"} seguidos · mejor racha {streak.best}
                      </p>
                      <ol className="mt-3 flex gap-1.5" aria-label="Hitos de racha">
                        {MILESTONES.map((m) => {
                          const done = streak.current >= m;
                          return (
                            <li key={m} className={`grid h-9 flex-1 place-items-center rounded-lg border text-sm font-bold transition-colors ${done ? "border-[var(--hot)] bg-[var(--hot)] text-[#1a1c2c] shadow-[0_0_14px_color-mix(in_oklab,var(--hot)_55%,transparent)]" : "border-[var(--line)] hx-mute"}`}>
                              {m}
                            </li>
                          );
                        })}
                      </ol>
                      <p className={`mt-2 text-sm ${atRisk ? "font-bold text-[var(--bad)]" : "hx-mute"}`}>
                        {atRisk && left ? `¡Responde algo en ${left.h}h ${left.m}m para no perderla!` : next ? `Faltan ${next - streak.current} días para el hito de ${next}.` : "¡Todos los hitos logrados!"}
                      </p>
                    </div>
                  )}
                  {open === "week" && (
                    <div>
                      <p className="hx-kicker">Esta semana</p>
                      <p className="mt-1 text-lg">
                        <b className="font-display capitalize">{DAY_NAME[dayIndex(d.date)]}</b>: {d.count} {d.count === 1 ? "respuesta" : "respuestas"}
                      </p>
                      <p className="hx-mute mt-1 text-sm">Total de la semana: {week.reduce((n, x) => n + x.count, 0)} respuestas en {week.filter((x) => x.count > 0).length} días activos.</p>
                    </div>
                  )}
                  {open === "accuracy" && (
                    <div>
                      <p className="hx-kicker">Precisión</p>
                      <p className="mt-1 text-lg">{stats.accuracy === null ? "Aún no has respondido." : `De cada 100 respuestas, aciertas ${stats.accuracy}.`}</p>
                      <div className="hx-bar mt-2">
                        <span style={{ width: `${stats.accuracy ?? 0}%` }} />
                      </div>
                    </div>
                  )}
                  {open === "answered" && (
                    <div>
                      <p className="hx-kicker">Respondidas</p>
                      <p className="mt-1 text-lg">{stats.answered.toLocaleString("es-CO")} preguntas en total. Cada acierto cuenta para tu XP.</p>
                    </div>
                  )}
                  {open === "quizzes" && (
                    <div>
                      <p className="hx-kicker">Quizzes</p>
                      <p className="mt-1 text-lg">{stats.quizzes} {stats.quizzes === 1 ? "quiz terminado" : "quizzes terminados"}.</p>
                    </div>
                  )}
                  {open === "today" && (
                    <div>
                      <p className="hx-kicker">Meta de hoy</p>
                      <p className="mt-1 text-lg">
                        {today.answered >= today.goal ? "¡Meta cumplida! Ya cuenta tu bonus de XP." : `Llevas ${today.answered} de ${today.goal} preguntas. Faltan ${today.goal - today.answered} para el bonus.`}
                      </p>
                      <div className="hx-bar hx-bar-gold mt-2">
                        <span style={{ width: `${Math.max(goalPct, 3)}%` }} />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="hx-dock pointer-events-auto flex items-stretch gap-1 rounded-2xl p-1.5">
              <Block active={open === "streak"} onClick={() => toggle("streak")} label="Racha" tone={atRisk ? "bad" : streak.activeToday ? "hot" : undefined}>
                <span onClick={(e) => { e.stopPropagation(); if (streak.activeToday) celebrate(); }} className="shrink-0">
                  <StreakFlame size={26} active={streak.activeToday || atRisk} days={streak.current} />
                </span>
                <span className="min-w-0 text-left leading-none">
                  <span className="block font-display text-base font-bold">{streak.current}</span>
                  <span className="block h-1 w-12 overflow-hidden rounded-full bg-[var(--track)]">
                    <span className="block h-full rounded-full bg-[var(--hot)] transition-[width] duration-700" style={{ width: `${Math.max(mPct, 6)}%` }} />
                  </span>
                </span>
              </Block>

              <Block active={open === "week"} onClick={() => toggle("week")} label="Semana" className="hidden sm:flex">
                <span className="flex h-7 items-end gap-[3px]">
                  {week.map((x, i) => (
                    <span
                      key={x.date}
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => { e.stopPropagation(); setDay(i); setOpen("week"); }}
                      title={`${DAY_NAME[dayIndex(x.date)]}: ${x.count}`}
                      className={`w-[9px] rounded-sm transition-all duration-300 ${x.count > 0 ? "bg-[var(--hot)]" : "bg-[var(--track)]"} ${i === day && open === "week" ? "ring-1 ring-[var(--fg)]" : ""} ${i === week.length - 1 ? "outline outline-1 outline-[var(--neon)]" : ""} hover:brightness-125`}
                      style={{ height: x.count === 0 ? 4 : Math.max(8, Math.round((x.count / max) * 28)) }}
                    />
                  ))}
                </span>
                <span className="hx-mute hidden text-[0.65rem] md:block">{DAY_LETTER[dayIndex(week[week.length - 1].date)]}</span>
              </Block>

              <Block active={open === "accuracy"} onClick={() => toggle("accuracy")} label="Precisión" className="hidden md:flex">
                <Ring pct={stats.accuracy ?? 0} />
              </Block>

              <Block active={open === "answered"} onClick={() => toggle("answered")} label="Respondidas" className="hidden md:flex">
                <span aria-hidden>✍️</span>
                <span className="font-display text-base font-bold tabular-nums">
                  <AnimatedNumber value={stats.answered} />
                </span>
              </Block>

              <Block active={open === "quizzes"} onClick={() => toggle("quizzes")} label="Quizzes" className="hidden lg:flex">
                <span aria-hidden>🏁</span>
                <span className="font-display text-base font-bold tabular-nums">{stats.quizzes}</span>
              </Block>

              <Block active={open === "today"} onClick={() => toggle("today")} label="Hoy" className="flex-1">
                <span className="min-w-0 flex-1 text-left leading-none">
                  <span className="flex justify-between text-[0.7rem]">
                    <span className="hx-mute">HOY</span>
                    <span className={goalPct >= 100 ? "font-bold text-[var(--ok)]" : "font-bold"}>
                      {Math.min(today.answered, today.goal)}/{today.goal}
                    </span>
                  </span>
                  <span className={`hx-bar mt-1 block ${goalPct >= 100 ? "" : "hx-bar-gold"}`}>
                    <span style={{ width: `${Math.max(goalPct, 5)}%` }} />
                  </span>
                </span>
              </Block>

              <button
                type="button"
                onClick={() => fold(true)}
                aria-label="Ocultar la barra"
                title="Ocultar"
                className="grid w-8 shrink-0 place-items-center rounded-xl text-xs text-[var(--mute)] transition-colors hover:bg-[var(--fg)]/10 hover:text-[var(--fg)]"
              >
                ▼
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Block({
  children,
  active,
  onClick,
  label,
  tone,
  className = "",
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "hot" | "bad";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-all duration-200 hover:bg-[var(--fg)]/8 active:scale-[0.97] ${
        active ? "border-[var(--neon)] bg-[var(--neon)]/10" : tone === "bad" ? "border-[var(--bad)]/60 bg-[var(--bad)]/10" : tone === "hot" ? "border-[var(--hot)]/50 bg-[var(--hot)]/8" : "border-transparent"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid h-8 w-8 place-items-center" aria-hidden>
      <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90">
        <circle cx="16" cy="16" r={r} fill="none" stroke="var(--track)" strokeWidth="4" />
        <circle cx="16" cy="16" r={r} fill="none" stroke="var(--ok)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <span className="absolute text-[0.55rem] font-bold">{pct}</span>
    </span>
  );
}
