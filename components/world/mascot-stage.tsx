"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MOOD_LABEL, type Mood } from "@/lib/mood";
import { useMascot, useMascotGestures, type MascotSlot } from "@/lib/mascots";
import { MascotPicker } from "./mascot-picker";
import { cheerSeconds, factSeconds, nextFact } from "@/lib/quotes";
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
  picker = false,
  say,
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
  /** Show the mascot picker, but only while the pointer is over the mascot (a tap on touch screens). */
  picker?: boolean;
  /** Fixed text for the bubble (the baby cheers the player on). Without it, the bubble shows a curious fact. */
  say?: string;
}) {
  const zone = useRef<HTMLDivElement>(null);
  useMascotGestures(zone, { slot });
  const enabled = useSyncExternalStore(subscribe, getCan3D, () => false);
  const { id } = useMascot(slot);
  const [ready, setReady] = useState(false);
  const [pickerOn, setPickerOn] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showPicker = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setPickerOn(true);
  };
  const hidePicker = (delay: number) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setPickerOn(false), delay);
  };
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);
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
      <div
        ref={zone}
        className={`absolute inset-0 z-20 touch-pan-y ${scrollToSwitch || picker ? "pointer-events-auto" : "pointer-events-none"}`}
        title={scrollToSwitch ? "Desplaza o desliza para cambiar de mascota" : undefined}
        onPointerEnter={picker ? (e) => e.pointerType !== "touch" && showPicker() : undefined}
        onPointerLeave={picker ? () => hidePicker(700) : undefined}
        onPointerUp={
          picker
            ? (e) => {
                if (e.pointerType === "touch") {
                  showPicker();
                  hidePicker(4000);
                }
              }
            : undefined
        }
      />
      {picker && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center transition duration-200 ${pickerOn ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
          onPointerEnter={showPicker}
          onPointerLeave={() => hidePicker(700)}
          onFocusCapture={showPicker}
          onBlurCapture={() => hidePicker(900)}
        >
          <div className={pickerOn ? "pointer-events-auto" : "pointer-events-none"}>
            <MascotPicker embedded slot={slot} compact={slot === "baby"} />
          </div>
        </div>
      )}
      <div className={`absolute inset-x-0 z-10 flex justify-center top-0 ${bubbleClassName}`}>
        {hydrated && (say ? <SayBubble key={`${mood}-${pulse}-${say}`} text={say} /> : <FactBubble key={`${mood}-${pulse}`} />)}
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
export function FactBubble({ delay = 0 }: { delay?: number }) {
  const [fact] = useState(nextFact);
  return (
    <div className="repi-bubble" style={{ animationDuration: `${factSeconds(fact.q)}s`, animationDelay: `${delay}s`, animationFillMode: "both" }}>
      <span className="repi-quote">{fact.q}</span>
      <span className="repi-by">Dato curioso · {fact.by}</span>
    </div>
  );
}

// A short line of encouragement.
export function SayBubble({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <div className="repi-bubble" style={{ animationDuration: `${cheerSeconds(text)}s`, animationDelay: `${delay}s`, animationFillMode: "both" }}>
      <span className="repi-quote font-bold">{text}</span>
    </div>
  );
}
