"use client";

import { useMemo } from "react";
import { InteractiveBackdrop } from "@/components/world/interactive-backdrop";
import { MascotStage } from "@/components/world/mascot-stage";
import { moodFor } from "@/lib/mood";

// Quiet scene behind the results: the soft backdrop and a small mascot in a corner. No trophy, no pile of effects.
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
      <MascotStage
        picker
        scrollToSwitch
        mood={mood}
        pulse={0}
        lastHit={null}
        streak={bestStreak}
        className="fixed bottom-16 right-4 z-0 hidden h-[min(30dvh,230px)] w-[min(18vw,210px)] lg:block"
      />
    </>
  );
}
