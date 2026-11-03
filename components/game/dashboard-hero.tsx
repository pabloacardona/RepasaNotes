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
  const { rank, streak, week, stats, today } = hud;
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
      <div className="hx-panel hx-tier-panel relative flex items-center overflow-hidden p-5 sm:p-6" style={{ ["--tc" as string]: tier.color }}>
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-40" style={{ background: `radial-gradient(circle, ${tier.color}, transparent 65%)` }} />
        <div className="relative flex w-full flex-wrap items-center gap-6">
          <motion.div
            onPointerMove={reduce ? undefined : onMove}
            onPointerLeave={reset}
            onClick={() => celebrate()}
            style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 700 }}
            className="cursor-pointer select-none px-3 py-4"
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
        <div className={`hx-panel p-5 ${atRisk ? "border-[var(--bad)]" : ""}`}>
          <div className="flex items-center gap-4">
            <StreakFlame size={74} active={streak.activeToday || atRisk} days={streak.current} />
            <div className="min-w-0 flex-1">
              <p className="hx-kicker">Racha</p>
              <p className="font-display font-bold text-3xl leading-none">
                <AnimatedNumber from={0} value={streak.current} />
              </p>
              <p className={`mt-1 ${atRisk ? "hx-blink font-bold text-[var(--bad)]" : "hx-mute"}`}>
                {atRisk ? "¡Juega hoy o la pierdes!" : streak.activeToday ? "¡Racha asegurada hoy!" : "Juega hoy para empezarla"} · mejor: {streak.best}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5" role="img" aria-label="Últimos 7 días">
            {week.map((d, i) => (
              <motion.span
                key={d.date}
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 400, damping: 16 }}
                className={`grid h-9 place-items-center rounded-lg border text-lg ${d.count > 0 ? "border-[var(--line-strong)] bg-[var(--hot)] text-[#1a1c2c]" : "border-[var(--line)] bg-[var(--track)]"} ${i === week.length - 1 ? "outline outline-2 outline-offset-2 outline-[var(--neon)]" : ""}`}
                title={`${d.date}: ${d.count} respuestas`}
              >
                {d.count > 0 ? "🔥" : ""}
              </motion.span>
            ))}
          </div>
        </div>

        <div className="hx-panel p-5">
          <p className="hx-kicker">Estadísticas</p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            {[
              ["Precisión", stats.accuracy ?? 0, "%"],
              ["Respondidas", stats.answered, ""],
              ["Quizzes", stats.quizzes, ""],
            ].map(([k, v, suf]) => (
              <div key={k as string} className="hx-lift rounded-xl border border-[var(--line)] bg-[var(--track)] px-1 py-2">
                <dd className="font-display font-bold text-sm">
                  <AnimatedNumber from={0} value={v as number} />
                  {suf}
                </dd>
                <dt className="hx-mute text-sm">{k}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <p className="flex justify-between text-sm">
              <span className="hx-mute">Misiones de hoy</span>
              <b>{doneQuests}/{quests.length}</b>
            </p>
            <ul className="mt-2 space-y-1.5">
              {quests.map((q) => (
                <li key={q.label} className="flex items-center gap-2">
                  <span aria-hidden>{q.done ? "✅" : q.emoji}</span>
                  <span className={`flex-1 ${q.done ? "text-[var(--ok)] line-through" : ""}`}>{q.label}</span>
                  <span className="hx-mute tabular-nums">{q.value}/{q.goal}</span>
                </li>
              ))}
            </ul>
            <div className={`mt-3 rounded-xl border px-3 py-2 ${bonus.claimed ? "border-[var(--hi)] bg-[var(--yel-soft)]" : "border-[var(--line)] bg-[var(--track)]"}`}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-bold">🎁 Bonus de misiones +{bonus.xp} XP</span>
                <span className={`text-xs font-bold ${bonus.claimed ? "text-[var(--hi)]" : "hx-mute"}`}>
                  {bonus.claimed ? "✓ Reclamado" : `${doneQuests}/${quests.length} · sin reclamar`}
                </span>
              </div>
              <div className="hx-bar mt-2 !h-2" role="progressbar" aria-valuenow={doneQuests} aria-valuemin={0} aria-valuemax={quests.length} aria-label="Misiones del día">
                <span style={{ width: `${Math.max((doneQuests / quests.length) * 100, 3)}%` }} />
              </div>
            </div>
            <p className="hx-mute mt-2 text-sm">Hoy llevas {today.answered} de {today.goal} preguntas.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
