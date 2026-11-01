"use client";

import Link from "next/link";

// Compact progress in the top bar: level, XP bar and the day streak. Visible on every page of the app.
export function XpChip({ level, title, pct, streak, activeToday }: { level: number; title: string; pct: number; streak: number; activeToday: boolean }) {
  return (
    <Link
      href="/dashboard"
      title={`${title} · ${pct}% hacia el nivel ${level + 1}`}
      className="group flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 transition hover:bg-white/20"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-yellow to-orange-400 font-display text-sm font-extrabold text-ink shadow-inner transition group-hover:scale-110">
        {level}
      </span>
      <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
        <span className="text-[0.65rem] font-bold uppercase leading-none tracking-wider text-white/80">{title}</span>
        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/20">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-yellow to-orange-400 transition-all duration-700"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </span>
      </span>
      <span
        className={`flex items-center gap-0.5 text-sm font-bold tabular-nums ${activeToday ? "text-yellow" : "text-white/60"}`}
        aria-label={`Racha de ${streak} días`}
      >
        <span className={activeToday && streak > 0 ? "inline-block animate-pulse" : ""}>🔥</span>
        {streak}
      </span>
    </Link>
  );
}
