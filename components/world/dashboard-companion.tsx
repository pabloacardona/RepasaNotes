"use client";

import { useEffect, useState } from "react";
import { CompanionDock } from "./companion-dock";
import type { Mood } from "@/lib/mood";

// The player's two companions on their own dashboard: the main one and a baby one (half the size).
// They slowly rotate through calm moods, so they keep quoting a thinker without hopping.
const CALM: Mood[] = ["idle", "curious", "thinking", "confident", "relieved"];
const BABY: Mood[] = ["happy", "curious", "idle", "excited", "confident"];

export function DashboardCompanion({ streak }: { streak: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => n + 1), 16000);
    return () => clearInterval(t);
  }, []);
  return <CompanionDock mood={CALM[i % CALM.length]} babyMood={BABY[(i + 2) % BABY.length]} streak={streak} />;
}
