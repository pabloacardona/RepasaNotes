"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { TIERS } from "@/lib/ranks";
import { RankEmblem } from "./rank-emblem";

const TAGLINE = [
  "Todos empezamos aquí.",
  "Ya le agarras el ritmo.",
  "La constancia se nota.",
  "El estudiante que todos admiran.",
  "Cristal puro: casi no fallas.",
  "Tu cabeza es un tesoro.",
  "Brillas bajo presión.",
  "Ahora enseñas a los demás.",
  "Leyenda del repaso.",
  "Solo los mejores llegan aquí.",
];

// The whole ladder, clickable. Ranks you have not reached stay locked but show how good they look,
// and the next goal is selected by default with the XP still missing.
export function RankLadder({ tierIndex, xp, preview = false }: { tierIndex: number; xp: number; preview?: boolean }) {
  const reduce = useReducedMotion();
  const next = Math.min(tierIndex + 1, TIERS.length - 1);
  const [sel, setSel] = useState(preview ? 3 : next);
  const t = TIERS[sel];
  const reached = !preview && sel <= tierIndex;
  const missing = Math.max(0, t.min - xp);
  const fill = preview ? 100 : ((tierIndex + Math.min(1, (xp - TIERS[tierIndex].min) / Math.max(1, (TIERS[Math.min(tierIndex + 1, TIERS.length - 1)].min - TIERS[tierIndex].min)))) / (TIERS.length - 1)) * 100;

  return (
    <div className="hx-panel p-4 sm:p-5" style={{ ["--tc" as string]: t.color }}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="hx-kicker">{preview ? "Los 10 rangos" : "La escalera"}</p>
        {!preview && <p className="hx-mute text-sm">{xp.toLocaleString("es-CO")} XP</p>}
      </div>

      <div className="relative mt-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        <div className="relative mx-auto flex w-max min-w-full items-end justify-between gap-2 px-2 pt-6">
          <div aria-hidden className="absolute inset-x-8 bottom-[11px] h-[6px] border-2 border-[var(--line-strong)] bg-[var(--track)]">
            <span className="block h-full bg-[var(--b2)] transition-all duration-700" style={{ width: `${fill}%` }} />
          </div>
          {TIERS.map((tier, i) => {
            const isCur = !preview && i === tierIndex;
            const isReached = preview || i <= tierIndex;
            const isSel = i === sel;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSel(i)}
                aria-pressed={isSel}
                aria-label={`${tier.name}${isCur ? " (tu rango)" : isReached ? "" : " (bloqueado)"}`}
                className={`relative z-10 flex w-[70px] shrink-0 flex-col items-center gap-1 pb-1 outline-offset-4 transition-transform duration-150 hover:-translate-y-1 ${isSel ? "-translate-y-2" : ""}`}
              >
                {isCur && <span className="hx-blink absolute -top-5 font-display font-bold text-[0.5rem] text-[var(--accent)]">TÚ</span>}
                <RankEmblem tierIndex={i} division={null} size={isCur ? 74 : 56} locked={!isReached} effects={isCur || isSel} />
                <span className={`font-display font-bold text-[0.45rem] uppercase leading-tight ${isSel ? "tier-text" : "hx-mute"}`} style={isSel ? { ["--tc2" as string]: tier.glow } : undefined}>
                  {tier.name}
                </span>
                <span aria-hidden className={`mt-1 h-3 w-3 rotate-45 border border-[var(--line-strong)] ${isReached ? "bg-[var(--accent)]" : "bg-[var(--track)]"} ${isSel ? "scale-150" : ""}`} />
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={sel}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="hx-tier-panel mt-3 flex flex-wrap items-center gap-5 rounded-2xl border-2 bg-[var(--surface-2)] p-4"
        >
          <RankEmblem tierIndex={sel} division={null} size={118} effects />
          <div className="min-w-0 flex-1">
            <p className="tier-text font-display font-bold text-xs" style={{ ["--tc2" as string]: t.glow }}>
              {t.name.toUpperCase()}
            </p>
            <p className="mt-1 text-xl">{TAGLINE[sel]}</p>
            <p className="hx-mute mt-1">
              Se desbloquea con <b className="text-[var(--fg)]">{t.min.toLocaleString("es-CO")} XP</b>
            </p>
            {!preview && (
              <p className={`mt-2 inline-block rounded-full border-2 px-3 py-0.5 text-sm font-bold ${reached ? "border-[var(--ok)] text-[var(--ok)]" : "border-[var(--hot)] text-[var(--hot)]"}`}>
                {reached ? (sel === tierIndex ? "★ TU RANGO ACTUAL" : "✓ Conseguido") : `🔒 Faltan ${missing.toLocaleString("es-CO")} XP`}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
