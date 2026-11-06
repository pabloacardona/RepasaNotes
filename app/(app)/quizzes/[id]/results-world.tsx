"use client";

import { useMemo } from "react";
import { InteractiveBackdrop } from "@/components/world/interactive-backdrop";
import { CompanionDock } from "@/components/world/companion-dock";
import { moodFor } from "@/lib/mood";

// Quiet scene behind the results: the soft backdrop and a both mascots on top of the page. No trophy, no pile of effects.
export function ResultsWorld({ score, total, bestStreak }: { score: number; total: number; bestStreak: number }) {
  const mood = useMemo(
    () =>
      moodFor({
        total, answered: total, hits: score, streak: 0, missStreak: 0, brokenStreak: 0, missStreakBefore: 0,
        lastResult: null, msSinceAnswer: 1e9, msOnQuestion: 0, currentAnswered: true, finished: true,
      }),
    [score, total],
  );
  return (
    <>
      <InteractiveBackdrop streak={bestStreak} calm />
      <CompanionDock mood={mood} babyMood={score * 2 >= total ? "happy" : "determined"} streak={bestStreak} />
    </>
  );
}
