"use client";

import { useMemo } from "react";
import { WorldBackdrop } from "@/components/world/world-backdrop";
import { moodFor, type WorldState } from "@/lib/mood";

// Final scene: the mascot reacts to the score and the trophy sits next to it.
export function ResultsWorld({ score, total, bestStreak }: { score: number; total: number; bestStreak: number }) {
  const pct = total ? score / total : 0;
  const state = useMemo<WorldState>(
    () => ({
      mood: moodFor({
        total, answered: total, hits: score, streak: 0, missStreak: 0, brokenStreak: 0, missStreakBefore: 0,
        lastResult: null, msSinceAnswer: 1e9, msOnQuestion: 0, currentAnswered: true, finished: true,
      }),
      weather: Math.min(1, 0.15 + pct * 0.9),
      bloom: pct,
      streak: bestStreak,
      pulse: 0,
    }),
    [score, total, bestStreak, pct],
  );
  const trophy = pct >= 0.9 ? "gold" : pct >= 0.7 ? "silver" : pct >= 0.5 ? "bronze" : null;
  return <WorldBackdrop state={state} lastHit={null} trophy={trophy} />;
}
