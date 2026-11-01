"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RankEmblem } from "./rank-emblem";
import { StreakFlame } from "./streak-flame";
import { leftToday, type HudData } from "./hud-utils";

export type { HudData } from "./hud-utils";

// Always-visible bar under the top nav: rank, the XP road to the next rank and the day streak.
// The detailed stats live in the dock at the bottom of the screen.
export function PlayerHud({ rank, streak }: HudData) {
  const [left, setLeft] = useState<{ h: number; m: number } | null>(null);
  useEffect(() => {
    const tick = () => setLeft(leftToday());
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  const atRisk = streak.current > 0 && !streak.activeToday;
  const almost = rank.pct >= 80;

  return (
    <div className="hx-hud text-ink">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-1.5 sm:gap-5 sm:px-6">
        <Link href="/logros" className="group flex min-w-0 flex-1 items-center gap-2 sm:gap-3" aria-label={`Rango ${rank.label}`}>
          <span className="shrink-0 transition-transform duration-300 ease-out group-hover:scale-110">
            <RankEmblem tierIndex={rank.tierIndex} division={rank.division} size={44} effects={false} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="tier-text truncate font-display text-sm font-bold" style={{ ["--tc2" as string]: rank.color }}>
                {rank.label}
              </span>
              <span className={`shrink-0 text-xs ${almost ? "hx-blink font-bold text-[var(--hi)]" : "hx-mute"}`}>
                {rank.nextLabel ? (almost ? `¡Casi! ${rank.toNext} XP` : `${rank.toNext} XP → ${rank.nextLabel}`) : "MAX"}
              </span>
            </span>
            <span className="hx-bar mt-1 block">
              <span style={{ width: `${Math.max(rank.pct, 4)}%` }} />
            </span>
          </span>
        </Link>

        <div
          className={`flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1 transition-colors duration-300 ${
            atRisk ? "border-[var(--bad)] bg-[var(--bad)]/12" : streak.activeToday ? "border-[var(--hot)]/70 bg-[var(--hot)]/12" : "border-[var(--line)]"
          }`}
          title={atRisk ? "Juega hoy para no perder la racha" : "Tu racha de días"}
        >
          <StreakFlame size={28} active={streak.activeToday || atRisk} days={streak.current} />
          <span className="leading-none">
            <span className="block font-display text-lg font-bold">{streak.current}</span>
            <span className={`block text-[0.65rem] ${atRisk ? "hx-blink font-bold text-[var(--bad)]" : "hx-mute"}`}>{atRisk && left ? `${left.h}h ${left.m}m` : streak.activeToday ? "asegurada" : "días"}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
