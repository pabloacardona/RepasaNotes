"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import { MOOD_LABEL, type WorldState } from "@/lib/mood";
import type { TrophyTier } from "./trophy";

// three.js, models and textures only load in the browser, in their own chunk.
const WorldScene = dynamic(() => import("./world-scene"), { ssr: false });

let can3D: boolean | undefined;
const subscribe = () => () => {};
function getCan3D() {
  if (can3D === undefined) {
    try {
      const c = document.createElement("canvas");
      can3D = !!c.getContext("webgl2") && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      can3D = false;
    }
  }
  return can3D;
}

const MOOD_EMOJI: Record<string, string> = {
  idle: "🙂", curious: "🧐", thinking: "🤔", sleepy: "😴", happy: "😊", excited: "🤩", onFire: "🔥", comeback: "😎",
  confident: "😏", oops: "😅", sad: "😢", shocked: "😱", crying: "😭", nervous: "😬", determined: "😤",
  celebrating: "🥳", proud: "😌", relieved: "😮‍💨", heartbroken: "💔",
};

// Gradient that follows the weather: used before the 3D loads and as the fallback.
function skyGradient(w: number) {
  const top = w > 0.5 ? `hsl(205 70% ${60 + (w - 0.5) * 30}%)` : `hsl(225 25% ${22 + w * 50}%)`;
  const bottom = w > 0.5 ? "hsl(45 60% 88%)" : `hsl(230 15% ${30 + w * 40}%)`;
  return `linear-gradient(180deg, ${top}, ${bottom})`;
}

// Full-screen living background: sky, garden and the mascot. Sits behind the page content.
export function WorldBackdrop({ state, lastHit, trophy }: { state: WorldState; lastHit: boolean | null; trophy?: TrophyTier | null }) {
  const enabled = useSyncExternalStore(subscribe, getCan3D, () => false);
  const [ready, setReady] = useState(false);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden" style={{ background: skyGradient(state.weather), transition: "background 1.5s" }}>
      {enabled && (
        <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: ready ? 1 : 0 }}>
          <WorldScene state={state} lastHit={lastHit} trophy={trophy} onReady={() => setReady(true)} />
        </div>
      )}
      {(!enabled || !ready) && (
        <div className="absolute bottom-[12%] right-[8%] hidden flex-col items-center gap-2 md:flex">
          <span className="text-8xl drop-shadow-xl">{MOOD_EMOJI[state.mood]}</span>
          {!enabled && <span className="rounded-full bg-ink/60 px-3 py-1 text-sm font-bold text-white">{MOOD_LABEL[state.mood]}</span>}
        </div>
      )}
    </div>
  );
}
