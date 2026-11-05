"use client";

import { useEffect, useState } from "react";
import { MascotStage } from "./mascot-stage";
import { MascotPicker } from "./mascot-picker";
import type { Mood } from "@/lib/mood";

// The player's companion on their own dashboard: always there in the corner, with a picker to change it.
// It slowly rotates through calm moods, so it keeps quoting a thinker without hopping or shaking.
const CALM: Mood[] = ["idle", "curious", "thinking", "confident", "relieved"];

export function DashboardCompanion({ streak }: { streak: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => n + 1), 14000);
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
    </div>
  );
}
