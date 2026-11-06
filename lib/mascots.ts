import { useEffect, useSyncExternalStore, type RefObject } from "react";
import { MASCOTS, type MascotChoice, type MascotId } from "./mascot-data";

export { MASCOTS };
export type { MascotChoice, MascotId };

/** "main" is the big companion; "baby" is the small one on the other side of the dashboard. */
export type MascotSlot = "main" | "baby";

const KEYS: Record<MascotSlot, string> = { main: "repasa_mascot", baby: "repasa_mascot_baby" };
const EVENT = "repasa-mascot";

const isId = (v: string | null): v is MascotId => MASCOTS.some((m) => m.id === v);

// "auto" (nothing saved yet) draws a random mascot once per page load, per slot.
const surprise: Partial<Record<MascotSlot, MascotId>> = {};
function randomMascot(slot: MascotSlot): MascotId {
  if (!surprise[slot]) {
    let id = MASCOTS[Math.floor(Math.random() * MASCOTS.length)].id;
    if (slot === "baby" && id === surprise.main) id = MASCOTS[(MASCOTS.findIndex((m) => m.id === id) + 1) % MASCOTS.length].id;
    surprise[slot] = id;
  }
  return surprise[slot]!;
}

function read(slot: MascotSlot = "main"): MascotChoice {
  try {
    const v = localStorage.getItem(KEYS[slot]);
    return isId(v) ? v : "auto";
  } catch {
    return "auto";
  }
}

let persist: ((choice: MascotChoice, slot: MascotSlot) => void) | null = null;
/** While a player is logged in, every change is also sent to the account (see MascotSync). */
export const setMascotPersist = (fn: typeof persist) => {
  persist = fn;
};
export const readMascotChoice = read;

export function setMascot(choice: MascotChoice, opts: { remote?: boolean; slot?: MascotSlot } = {}) {
  const slot = opts.slot ?? "main";
  if (opts.remote !== false) persist?.(choice, slot);
  try {
    if (choice === "auto") localStorage.removeItem(KEYS[slot]);
    else localStorage.setItem(KEYS[slot], choice);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

/** The saved choice ("auto" or an id) and the mascot that should be on screen. */
export function useMascot(slot: MascotSlot = "main"): { choice: MascotChoice; id: MascotId } {
  const choice = useSyncExternalStore(subscribe, () => read(slot), () => "auto" as MascotChoice);
  // The server cannot know the random draw, so it renders a fixed one and the client swaps after hydrating.
  const id = useSyncExternalStore(
    subscribe,
    () => {
      const c = read(slot);
      return c === "auto" ? randomMascot(slot) : c;
    },
    () => (slot === "main" ? "Panda" : "Pig") as MascotId,
  );
  return { choice, id };
}

function currentId(slot: MascotSlot): MascotId {
  const c = read(slot);
  return c === "auto" ? randomMascot(slot) : c;
}

/** Switches to the next (1) or previous (-1) mascot, starting from the one on screen. */
export function stepMascot(dir: 1 | -1, slot: MascotSlot = "main") {
  const i = MASCOTS.findIndex((m) => m.id === currentId(slot));
  setMascot(MASCOTS[(i + dir + MASCOTS.length) % MASCOTS.length].id, { slot });
}

/** Picks a different mascot at random, right now (the dice). */
export function randomizeMascot(slot: MascotSlot = "main") {
  const now = currentId(slot);
  const others = MASCOTS.filter((m) => m.id !== now);
  setMascot(others[Math.floor(Math.random() * others.length)].id, { slot });
}

/**
 * Easy switching on any element: mouse wheel or touchpad scroll (either axis), a horizontal swipe on touch screens,
 * and the left / right arrow keys while the element has focus. Vertical touch scrolling is left alone.
 */
export function useMascotGestures(ref: RefObject<HTMLElement | null>, opts: { wheel?: boolean; slot?: MascotSlot; swipe?: boolean } = {}) {
  const wheel = opts.wheel ?? true;
  const swipe = opts.swipe ?? true;
  const slot = opts.slot ?? "main";
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // One scroll gesture changes the mascot exactly once, however hard or long it is. After a step the wheel stays locked
    // until the events stop for a moment, so a touchpad's inertia (or a fast spin) cannot skip through several mascots.
    // One scroll gesture changes the mascot exactly once, however hard or long it is. After a step the wheel stays locked
    // until the events stop for a moment, so a touchpad's inertia (or a fast spin) cannot skip through several mascots.
    let acc = 0;
    let locked = false;
    let lastEvent = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // a touchpad pinch resizes the mascot instead (see MascotStage)
      e.preventDefault();
      // A pause between events ends the gesture. The event time is used (not a timer), so a busy page cannot fake a pause.
      if (e.timeStamp - lastEvent > 180) {
        locked = false;
        acc = 0;
      }
      lastEvent = e.timeStamp;
      if (locked) return;
      acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(acc) >= 30) {
        stepMascot(acc > 0 ? 1 : -1, slot);
        locked = true;
        acc = 0;
      }
    };
    let x0 = 0;
    let y0 = 0;
    const onDown = (e: PointerEvent) => {
      x0 = e.clientX;
      y0 = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      const dx = e.clientX - x0;
      if (swipe && e.pointerType !== "mouse" && Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(e.clientY - y0) * 1.4) stepMascot(dx < 0 ? 1 : -1, slot);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        stepMascot(e.key === "ArrowRight" ? 1 : -1, slot);
      }
    };
    if (wheel) el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("keydown", onKey);
    };
  }, [ref, wheel, slot, swipe]);
}
