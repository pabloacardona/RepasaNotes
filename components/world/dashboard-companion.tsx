"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CompanionDock } from "./companion-dock";
import type { Mood } from "@/lib/mood";

// The player's two companions on their own dashboard: the main one and a baby one (half the size).
// They slowly rotate through calm moods, so they keep quoting a thinker without hopping.
const CALM: Mood[] = ["idle", "curious", "thinking", "confident", "relieved"];
const BABY: Mood[] = ["happy", "curious", "idle", "excited", "confident"];

// Phones do not get the 3D companions on the dashboard: two WebGL canvases plus drag and pinch handling made it feel slow.
const PHONE = "(max-width: 767px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(PHONE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function DashboardCompanion({ streak }: { streak: number }) {
  const phone = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE).matches,
    () => true,
  );
  const [i, setI] = useState(0);
  useEffect(() => {
    if (phone || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => n + 1), 16000);
    return () => clearInterval(t);
  }, [phone]);
  if (phone) return null;
  return <CompanionDock mood={CALM[i % CALM.length]} babyMood={BABY[(i + 2) % BABY.length]} streak={streak} />;
}
