"use client";

import { useEffect, useState } from "react";
import { MascotStage } from "@/components/world/mascot-stage";
import type { Mood } from "@/lib/mood";

const SCRIPT: { mood: Mood; hit: boolean }[] = [
  { mood: "happy", hit: true },
  { mood: "excited", hit: true },
  { mood: "thinking", hit: true },
  { mood: "oops", hit: false },
  { mood: "determined", hit: true },
  { mood: "celebrating", hit: true },
];

// The landing mascot plays a short loop of moods, with a hop or a shake on each one, so the page is alive on arrival.
export function HeroMascot({ className = "" }: { className?: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setStep((s) => s + 1), 14000);
    return () => clearInterval(t);
  }, []);
  const cur = SCRIPT[step % SCRIPT.length];
  return <MascotStage picker fps={30} className={className} mood={cur.mood} pulse={step + 1} lastHit={cur.hit} streak={cur.hit ? 3 : 0} />;
}
