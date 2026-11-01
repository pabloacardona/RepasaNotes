"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import { MOOD_LABEL, type Mood } from "@/lib/mood";
import { useMascot } from "@/lib/mascots";
import { mascotLine } from "./repi";
import type { TrophyTier } from "./trophy";

// three.js, the models and textures only load in the browser, in their own chunk.
const MascotCanvas = dynamic(() => import("./mascot-canvas"), { ssr: false });

let can3D: boolean | undefined;
const subscribe = () => () => {};
function getCan3D() {
  if (can3D === undefined) {
    try {
      can3D = !!document.createElement("canvas").getContext("webgl2");
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

// The mascot next to the content: a small transparent canvas with a speech bubble above it.
// Size and position come from `className`; the page behind is the interactive backdrop.
export function MascotStage({
  mood,
  pulse,
  lastHit,
  streak,
  trophy,
  className = "",
}: {
  mood: Mood;
  pulse: number;
  lastHit: boolean | null;
  streak: number;
  trophy?: TrophyTier | null;
  className?: string;
}) {
  const enabled = useSyncExternalStore(subscribe, getCan3D, () => false);
  const { id } = useMascot();
  const [ready, setReady] = useState(false);

  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      <div className="absolute inset-x-0 top-0 z-10 flex justify-center">
        <div key={`${mood}-${pulse}`} className="repi-bubble">
          {mascotLine(mood, pulse)}
        </div>
      </div>

      {enabled ? (
        <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: ready ? 1 : 0 }}>
          <MascotCanvas
            mascot={id}
            mood={mood}
            pulse={pulse}
            lastHit={lastHit}
            streak={streak}
            trophy={trophy}
            onReady={() => setReady(true)}
          />
        </div>
      ) : null}
      {(!enabled || !ready) && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-7xl drop-shadow-xl">{MOOD_EMOJI[mood]}</span>
        </div>
      )}
      <span className="sr-only">Repi: {MOOD_LABEL[mood]}</span>
    </div>
  );
}
