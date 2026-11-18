"use client";

import { useMemo } from "react";
import { CompanionDock } from "@/components/world/companion-dock";
import { moodFor } from "@/lib/mood";

// Quiet scene behind the results: just the static page background and both mascots on top of it.
// The interactive particle backdrop is gone here: it ran a full-screen canvas loop on a page that only shows a score.
export function ResultsWorld({ score, total, bestStreak }: { score: number; total: number; bestStreak: number }) {
  const mood = useMemo(
    () =>
      moodFor({
        total, answered: total, hits: score, streak: 0, missStreak: 0, brokenStreak: 0, missStreakBefore: 0,
        lastResult: null, msSinceAnswer: 1e9, msOnQuestion: 0, currentAnswered: true, finished: true,
      }),
    [score, total],
  );
  return <CompanionDock mood={mood} babyMood={score * 2 >= total ? "happy" : "determined"} streak={bestStreak} />;
}
