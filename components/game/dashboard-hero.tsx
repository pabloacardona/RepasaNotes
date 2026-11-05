"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import type { PointerEvent } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { celebrate } from "@/components/confetti";
import { RankEmblem } from "./rank-emblem";
import { StreakFlame } from "./streak-flame";
import { TIERS } from "@/lib/ranks";
import type { HudData } from "./hud-utils";

// Dashboard top: a big rank crest that tilts towards the pointer and celebrates on click, the XP road to the next rank,
// the streak with its week, and animated stats.
export function DashboardHero({
  hud,
  quests,
  bonus,
}: {
  hud: HudData;
  quests: { done: boolean; label: string; value: number; goal: number; emoji: string }[];
  bonus: { xp: number; claimed: boolean };
}) {
  const { rank, streak, week, today } = hud;
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-1, 1], [14, -14]), { stiffness: 200, damping: 16 });
  const ry = useSpring(useTransform(px, [-1, 1], [-18, 18]), { stiffness: 200, damping: 16 });
  const tier = TIERS[rank.tierIndex];
  const nextTier = TIERS[Math.min(rank.tierIndex + 1, TIERS.length - 1)];
  const atRisk = streak.current > 0 && !streak.activeToday;
  const doneQuests = quests.filter((q) => q.done).length;

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width) * 2 - 1);
    py.set(((e.clientY - r.top) / r.height) * 2 - 1);
  }
  const reset = () => (px.set(0), py.set(0));

  return (
    <section aria-label="Tu progreso" className="hx mb-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      {/* Rank */}
      <div className="hx-panel hx-tier-panel relative flex items-center self-start overflow-hidden p-3 sm:p-4" style={{ ["--tc" as string]: tier.color }}>
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-40" style={{ background: `radial-gradient(circle, ${tier.color}, transparent 65%)` }} />
        <div className="relative flex w-full flex-wrap items-center gap-3 sm:gap-5">
          <motion.div
            onPointerMove={reduce ? undefined : onMove}
            onPointerLeave={reset}
            onClick={() => celebrate()}
            style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 700 }}
            className="cursor-pointer select-none"
            role="button"
            tabIndex={0}
            aria-label="Celebrar tu rango"
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && celebrate()}
          >
            <RankEmblem tierIndex={rank.tierIndex} division={rank.division} size={170} />
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="hx-kicker">Tu rango</p>
            <h1 className="hx-title hx-rank mt-1 text-5xl sm:text-6xl" style={{ ["--tg2" as string]: tier.glow }}>
              {rank.label}
            </h1>
            <div className="relative mt-4">
              <div className="hx-bar !h-5" role="progressbar" aria-valuenow={rank.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Camino al siguiente rango">
                <span style={{ width: `${Math.max(rank.pct, 3)}%` }} />
              </div>
              {[25, 50, 75].map((p) => (
                <span key={p} aria-hidden className="hx-tick" style={{ left: `${p}%` }} />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="hx-mute">
                {rank.nextLabel ? (
                  <>
                    Faltan <b className="text-[var(--fg)]"><AnimatedNumber from={0} value={rank.toNext} /> XP</b> para
                  </>
                ) : (
                  "Estás en la cima"
                )}
              </p>
              {rank.nextLabel && (
                <span className="tier-text flex items-center gap-2 font-display font-bold text-[0.55rem]" style={{ ["--tc2" as string]: nextTier.glow }}>
                  <RankEmblem tierIndex={Math.min(rank.tierIndex + 1, TIERS.length - 1)} size={34} effects={false} locked={rank.tierIndex + 1 > rank.tierIndex} />
                  {rank.nextLabel}
                </span>
              )}
            </div>
            <Link href="/quizzes/nuevo" className="hx-btn hx-btn-gold mt-5 !px-6 !py-3">
              ▶ Jugar para subir
            </Link>
          </div>
        </div>
      </div>

      {/* Streak + stats */}
      <div className="grid gap-5">
        <div className={`hx-panel p-3.5 ${atRisk ? "border-[var(--bad)]" : ""}`}>
          <div className="flex items-center gap-3">
            <StreakFlame size={44} active={streak.activeToday || atRisk} days={streak.current} />
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold leading-none">
                  <AnimatedNumber from={0} value={streak.current} />
                </span>
                <span className="hx-kicker">días de racha</span>
              </p>
              <p className={`mt-0.5 text-sm ${atRisk ? "hx-blink font-bold text-[var(--bad)]" : "hx-mute"}`}>
                {atRisk ? "¡Juega hoy o la pierdes!" : streak.activeToday ? "Asegurada hoy" : "Juega hoy para empezar"} · mejor {streak.best}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5" role="img" aria-label="Últimos 7 días">
            {week.map((d, i) => (
              <span
                key={d.date}
                className={`wave-cell ${d.count > 0 ? "wave-on" : ""} ${i === week.length - 1 ? "wave-today" : ""}`}
                style={{ ["--i" as string]: i }}
                title={`${d.date}: ${d.count} respuestas`}
              />
            ))}
          </div>
        </div>

        <div className="hx-panel p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="hx-kicker">Hoy</p>
            <p className="hx-mute text-sm tabular-nums">
              <b className="text-[var(--fg)]">{today.answered}</b> / {today.goal} preguntas
            </p>
          </div>
          <div className="hx-bar mt-2 !h-3" role="progressbar" aria-valuenow={Math.min(today.answered, today.goal)} aria-valuemin={0} aria-valuemax={today.goal} aria-label="Meta diaria">
            <span style={{ width: `${Math.max(Math.min(today.answered / today.goal, 1) * 100, 3)}%` }} />
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {quests.map((q) => (
              <li key={q.label} className="flex items-center gap-2">
                <span aria-hidden>{q.done ? "✅" : q.emoji}</span>
                <span className={`flex-1 ${q.done ? "text-[var(--ok)] line-through" : ""}`}>{q.label}</span>
                <span className="hx-mute tabular-nums">{q.value}/{q.goal}</span>
              </li>
            ))}
          </ul>
          <p className={`mt-3 text-sm ${bonus.claimed ? "font-bold text-[var(--hi)]" : "hx-mute"}`}>
            🎁 {bonus.claimed ? `Bonus de +${bonus.xp} XP reclamado` : `Completa las ${quests.length} misiones y gana +${bonus.xp} XP (${doneQuests}/${quests.length})`}
          </p>
        </div>
      </div>
    </section>
  );
}
