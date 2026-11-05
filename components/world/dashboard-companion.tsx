"use client";

import { useEffect, useState } from "react";
import { MascotStage } from "./mascot-stage";
import type { Mood } from "@/lib/mood";

// The player's two companions on their own dashboard: the main one on the right and a baby one (half the size) on the
// left. Each has its own picker. They slowly rotate through calm moods, so they keep quoting a thinker without hopping.
const CALM: Mood[] = ["idle", "curious", "thinking", "confident", "relieved"];
const BABY: Mood[] = ["happy", "curious", "idle", "excited", "confident"];

export function DashboardCompanion({ streak }: { streak: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => n + 1), 16000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden lg:block">
      <MascotStage
        scrollToSwitch
        picker
        mood={CALM[i % CALM.length]}
        pulse={0}
        lastHit={null}
        streak={streak}
        className="fixed bottom-20 right-[max(1rem,4vw)] z-0 h-[min(30dvh,230px)] w-[min(18vw,210px)]"
      />

      <MascotStage
        slot="baby"
        scrollToSwitch
        picker
        mood={BABY[(i + 2) % BABY.length]}
        pulse={0}
        lastHit={null}
        streak={0}
        bubbleClassName="hidden"
        className="fixed bottom-28 left-[max(1.5rem,6vw)] z-0 h-[min(15dvh,115px)] w-[min(9vw,105px)]"
      />
    </div>
  );
}
