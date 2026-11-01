"use client";

import { useMemo } from "react";
import { InteractiveBackdrop } from "@/components/world/interactive-backdrop";
import { MascotStage } from "@/components/world/mascot-stage";
import { MascotPicker } from "@/components/world/mascot-picker";
import { moodFor } from "@/lib/mood";

// Final scene: the interactive backdrop, with the mascot reacting to the score and the trophy beside it.
export function ResultsWorld({ score, total, bestStreak }: { score: number; total: number; bestStreak: number }) {
  const pct = total ? score / total : 0;
  const mood = useMemo(
    () =>
      moodFor({
        total, answered: total, hits: score, streak: 0, missStreak: 0, brokenStreak: 0, missStreakBefore: 0,
        lastResult: null, msSinceAnswer: 1e9, msOnQuestion: 0, currentAnswered: true, finished: true,
      }),
    [score, total],
  );
  const trophy = pct >= 0.9 ? "gold" : pct >= 0.7 ? "silver" : pct >= 0.5 ? "bronze" : null;
  return (
    <>
      <InteractiveBackdrop streak={bestStreak} calm />
      <MascotStage
        mood={mood}
        pulse={0}
        lastHit={null}
        streak={bestStreak}
        trophy={trophy}
        className="fixed left-1/2 top-[4.4rem] z-0 h-[25dvh] w-[min(86vw,360px)] -translate-x-1/2 landscape:bottom-6 landscape:left-auto landscape:right-4 landscape:top-24 landscape:h-auto landscape:w-[min(40vw,520px)] landscape:translate-x-0 sm:landscape:right-8"
      />
      <MascotPicker className="bottom-4 right-4" />
    </>
  );
}
