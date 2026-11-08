"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MOOD_LABEL, type Mood } from "@/lib/mood";
import { useMascot, useMascotGestures, type MascotSlot } from "@/lib/mascots";
import { MAX_Y, clampScale, placeCompanion, readLayout, saveLayout, useCompanionLayout } from "@/lib/companion-layout";
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
  movable = false,
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
  /** The player can drag this mascot anywhere on the screen and resize it (see lib/companion-layout.ts). */
  movable?: boolean;
}) {
  const zone = useRef<HTMLDivElement>(null);
  useMascotGestures(zone, { slot, swipe: !movable });
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
  // Saved spot and size: written straight to the element, and kept inside the window when it is resized.
  const layout = useCompanionLayout(slot);
  useEffect(() => {
    const el = root.current;
    if (!movable || !el) return;
    const apply = () => {
      placeCompanion(el, layout);
      // Near the top of the screen the speech bubble goes under the mascot instead of above it.
      el.dataset.below = el.getBoundingClientRect().top < 150 ? "true" : "false";
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [movable, layout]);
  // Dragging: a press that moves more than a few pixels drags the mascot; a press that does not move is a tap.
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean; x: number; y: number } | null>(null);
  // Pinch: two fingers on a touch screen, or the pinch gesture of a touchpad (the browser sends it as ctrl + wheel).
  const fingers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d0: number; s0: number; s: number } | null>(null);
  const gap = () => {
    const [a, b] = [...fingers.current.values()];
    return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
  };
  useEffect(() => {
    const zoneEl = zone.current;
    if (!movable || !zoneEl) return;
    let pending: number | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey || !root.current) return;
      e.preventDefault();
      pending = clampScale((pending ?? readLayout(slot).scale) * Math.exp(-e.deltaY * 0.01));
      placeCompanion(root.current, { ...readLayout(slot), scale: pending });
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (pending !== null) saveLayout(slot, { scale: pending });
        pending = null;
      }, 160);
    };
    zoneEl.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      clearTimeout(timer);
      zoneEl.removeEventListener("wheel", onWheel);
    };
  }, [movable, slot]);
  const onDown = (e: React.PointerEvent) => {
    const el = root.current;
    if (!movable || !el || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (e.pointerType === "touch") {
      fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.current.size === 2) {
        drag.current = null;
        pinch.current = { d0: gap(), s0: readLayout(slot).scale, s: readLayout(slot).scale };
        setPickerOn(false);
        return;
      }
    }
    const r = el.getBoundingClientRect();
    drag.current = { dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - r.bottom, sx: e.clientX, sy: e.clientY, moved: false, x: 0, y: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = root.current;
    if (fingers.current.has(e.pointerId)) fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && el && fingers.current.size === 2) {
      pinch.current.s = clampScale((pinch.current.s0 * gap()) / pinch.current.d0);
      placeCompanion(el, { ...readLayout(slot), scale: pinch.current.s });
      return;
    }
    if (!d || !el) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
    d.moved = true;
    setPickerOn(false);
    d.x = (e.clientX - d.dx) / window.innerWidth;
    d.y = (e.clientY - d.dy) / window.innerHeight;
    placeCompanion(el, { x: d.x, y: d.y, scale: readLayout(slot).scale });
  };
  const onEnd = (e: React.PointerEvent) => {
    fingers.current.delete(e.pointerId);
    if (pinch.current) {
      if (fingers.current.size < 2) {
        saveLayout(slot, { scale: pinch.current.s });
        pinch.current = null;
      }
      return;
    }
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    saveLayout(slot, { x: Math.min(1, Math.max(0, d.x)), y: Math.min(MAX_Y, Math.max(0, d.y)) });
  };
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
  // The 3D canvas is larger than the stage on every side (the camera backs off to match), so hops, sparkles and a big scale never touch its edges.
  // The fact is drawn in the browser (it is random), so nothing is rendered until the page has hydrated.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <div ref={root} className={`group/stage pointer-events-none ${className}`} aria-hidden>
      <div
        ref={zone}
        className={`absolute inset-0 z-20 ${movable ? "cursor-grab touch-none active:cursor-grabbing" : "touch-pan-y"} ${scrollToSwitch || picker || movable ? "pointer-events-auto" : "pointer-events-none"}`}
        onPointerDown={movable ? onDown : undefined}
        onPointerMove={movable ? onMove : undefined}
        onPointerCancel={movable ? onEnd : undefined}
        onLostPointerCapture={movable ? onEnd : undefined}
        title={movable ? "Arrástrame donde quieras" : scrollToSwitch ? "Desplaza para cambiar de mascota" : undefined}
        onPointerEnter={picker ? (e) => e.pointerType !== "touch" && showPicker() : undefined}
        onPointerLeave={picker ? () => hidePicker(700) : undefined}
        onPointerUp={
          picker
            ? (e) => {
                if (e.pointerType === "touch" && !drag.current?.moved) {
                  showPicker();
                  hidePicker(4000);
                }
              }
            : undefined
        }
      />
      {picker && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-[var(--lift,0px)] z-30 flex justify-center transition duration-200 ${pickerOn ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
          onPointerEnter={showPicker}
          onPointerLeave={() => hidePicker(700)}
          onFocusCapture={showPicker}
          onBlurCapture={() => hidePicker(900)}
        >
          <div className={pickerOn ? "pointer-events-auto" : "pointer-events-none"}>
            <MascotPicker embedded slot={slot} compact={slot === "baby"} movable={movable} />
          </div>
        </div>
      )}
      {/* A movable mascot can be tiny, so its bubble stands above it (below it near the top of the screen) and never covers it. */}
      <div className={`absolute z-10 flex justify-center ${movable ? "left-1/2 w-[17rem] max-w-[90vw] -translate-x-1/2" : "inset-x-0"} ${movable ? "bottom-full mb-1 group-data-[below=true]/stage:bottom-auto group-data-[below=true]/stage:top-full group-data-[below=true]/stage:mb-0 group-data-[below=true]/stage:mt-1" : "top-0"} ${bubbleClassName}`}>
        {hydrated && (say ? <SayBubble key={`${mood}-${pulse}-${say}`} text={say} /> : <FactBubble key={`${mood}-${pulse}`} />)}
      </div>

      {enabled ? (
        <div className="absolute -inset-[17%] transition-opacity duration-700" style={{ opacity: ready ? 1 : 0 }}>
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
