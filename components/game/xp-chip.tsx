"use client";

import Link from "next/link";
import { RankEmblem } from "./rank-emblem";

// Compact rank in the top bar: emblem, division, LP bar and the day streak. Visible on every page of the app.
export type ChipGame = { tierIndex: number; division: number | null; label: string; pct: number; streak: number; activeToday: boolean };

export function XpChip({ tierIndex, division, label, pct, streak, activeToday }: ChipGame) {
  return (
    <Link
      href="/logros"
      title={`${label} · ${pct} LP`}
      className="group flex items-center gap-2 rounded-full border border-[#785a28]/70 bg-[#07101e] py-0.5 pl-0.5 pr-3 transition hover:border-[#c8aa6e]"
    >
      <span className="transition group-hover:scale-110">
        <RankEmblem tierIndex={tierIndex} division={division} size={34} />
      </span>
      <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
        <span className="font-[family-name:var(--font-cinzel)] text-[0.68rem] font-bold uppercase leading-none tracking-wider text-[#f0e6d2]">{label}</span>
        <span className="hx-bar hx-bar-gold !h-1.5 w-20">
          <span style={{ width: `${Math.max(pct, 4)}%` }} />
        </span>
      </span>
      <span
        className={`flex items-center gap-0.5 text-sm font-bold tabular-nums ${activeToday ? "text-[#f0d89a]" : "text-white/50"}`}
        aria-label={`Racha de ${streak} días`}
      >
        <span className={activeToday && streak > 0 ? "inline-block animate-pulse" : ""}>🔥</span>
        {streak}
      </span>
    </Link>
  );
}
