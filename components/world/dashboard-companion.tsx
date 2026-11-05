"use client";

import { useEffect, useState } from "react";
import { MascotStage } from "./mascot-stage";
import { MascotPicker } from "./mascot-picker";
import type { Mood } from "@/lib/mood";

// The player's two companions on their own dashboard: the main one on the right and a baby one (half the size) on the
// left. Each has its own picker. They slowly rotate through calm moods, so they keep quoting a thinker without hopping.
const CALM: Mood[] = ["idle", "curious", "thinking", "confident", "relieved"];
const BABY: Mood[] = ["happy", "curious", "idle", "excited", "confident"];

export function DashboardCompanion({ streak }: { streak: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => n + 1), 12000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden lg:block">
      <MascotStage
        scrollToSwitch
        mood={CALM[i % CALM.length]}
        pulse={0}
        lastHit={null}
        streak={streak}
        className="fixed bottom-16 right-4 z-0 h-[min(30dvh,230px)] w-[min(18vw,210px)]"
      />
      <MascotPicker className="right-4 bottom-[calc(4rem+min(30dvh,230px)+0.5rem)]" />

      <MascotStage
        slot="baby"
        scrollToSwitch
        mood={BABY[(i + 2) % BABY.length]}
        pulse={0}
        lastHit={null}
        streak={0}
        bubbleClassName="hidden"
        className="fixed bottom-16 left-4 z-0 h-[min(15dvh,115px)] w-[min(9vw,105px)]"
      />
      <MascotPicker slot="baby" compact className="left-4 bottom-[calc(4rem+min(15dvh,115px)+0.5rem)]" />
    </div>
  );
}
