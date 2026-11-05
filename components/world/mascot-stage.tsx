"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MOOD_LABEL, type Mood } from "@/lib/mood";
import { useMascot, useMascotGestures, type MascotSlot } from "@/lib/mascots";
import { factSeconds, nextFact } from "@/lib/quotes";
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
  bubbleClassName = "",
  className = "",
  scrollToSwitch = false,
  slot = "main",
  fps = 60,
}: {
  mood: Mood;
  pulse: number;
  lastHit: boolean | null;
  streak: number;
  trophy?: TrophyTier | null;
  /** Extra classes for the quote bubble (e.g. hide it on small screens). */
  bubbleClassName?: string;
  className?: string;
  /** Scroll or swipe over the mascot to change it. Off by default so it never steals page scrolling. */
  scrollToSwitch?: boolean;
  /** Which companion this stage shows: the main one or the baby one. */
  slot?: MascotSlot;
  /** Frame rate cap for the 3D canvas (calm pages use 30). */
  fps?: number;
}) {
  const zone = useRef<HTMLDivElement>(null);
  useMascotGestures(zone, { slot });
  const enabled = useSyncExternalStore(subscribe, getCan3D, () => false);
  const { id } = useMascot(slot);
  const [ready, setReady] = useState(false);
  // Render only while the mascot is on screen and the tab is visible.
  const root = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [tabOn, setTabOn] = useState(true);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "60px" });
    io.observe(el);
    const vis = () => setTabOn(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);
  // The fact is drawn in the browser (it is random), so nothing is rendered until the page has hydrated.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <div ref={root} className={`pointer-events-none ${className}`} aria-hidden>
      <div ref={zone} className={`absolute inset-0 z-20 touch-pan-y ${scrollToSwitch ? "pointer-events-auto" : "pointer-events-none"}`} title={scrollToSwitch ? "Desplaza o desliza para cambiar de mascota" : undefined} />
      <div className={`absolute inset-x-0 z-10 flex justify-center top-0 ${bubbleClassName}`}>
        {hydrated && <FactBubble key={`${mood}-${pulse}`} />}
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
            active={onScreen && tabOn}
            fps={fps}
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

// A curious fact in a speech bubble. It stays longer the longer the text is, so there is time to read it.
function FactBubble() {
  const [fact] = useState(nextFact);
  return (
    <div className="repi-bubble" style={{ animationDuration: `${factSeconds(fact.q)}s` }}>
      <span className="repi-quote">{fact.q}</span>
      <span className="repi-by">Dato curioso · {fact.by}</span>
    </div>
  );
}
