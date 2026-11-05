import { useEffect, useSyncExternalStore, type RefObject } from "react";
import { MASCOTS, type MascotChoice, type MascotId } from "./mascot-data";

export { MASCOTS };
export type { MascotChoice, MascotId };

const KEY = "repasa_mascot";
const EVENT = "repasa-mascot";

const isId = (v: string | null): v is MascotId => MASCOTS.some((m) => m.id === v);

// "auto" draws a random mascot once per page load.
let surprise: MascotId | undefined;
function randomMascot(): MascotId {
  surprise ??= MASCOTS[Math.floor(Math.random() * MASCOTS.length)].id;
  return surprise;
}

function read(): MascotChoice {
  try {
    const v = localStorage.getItem(KEY);
    return isId(v) ? v : "auto";
  } catch {
    return "auto";
  }
}

let persist: ((choice: MascotChoice) => void) | null = null;
/** While a player is logged in, every change is also sent to the account (see MascotSync). */
export const setMascotPersist = (fn: typeof persist) => {
  persist = fn;
};
export const readMascotChoice = read;

export function setMascot(choice: MascotChoice, opts: { remote?: boolean } = {}) {
  if (opts.remote !== false) persist?.(choice);
  try {
    if (choice === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
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
export function useMascot(): { choice: MascotChoice; id: MascotId } {
  const choice = useSyncExternalStore(subscribe, read, () => "auto" as MascotChoice);
  // The server cannot know the random draw, so it renders Panda and the client swaps after hydrating.
  const id = useSyncExternalStore(
    subscribe,
    () => {
      const c = read();
      return c === "auto" ? randomMascot() : c;
    },
    () => "Panda" as MascotId,
  );
  return { choice, id };
}

/** Switches to the next (1) or previous (-1) mascot, starting from the one on screen. */
export function stepMascot(dir: 1 | -1) {
  const c = read();
  const current = c === "auto" ? randomMascot() : c;
  const i = MASCOTS.findIndex((m) => m.id === current);
  setMascot(MASCOTS[(i + dir + MASCOTS.length) % MASCOTS.length].id);
}

/**
 * Easy switching on any element: mouse wheel or touchpad scroll (either axis), a horizontal swipe on touch screens,
 * and the left / right arrow keys while the element has focus. Vertical touch scrolling is left alone.
 */
export function useMascotGestures(ref: RefObject<HTMLElement | null>, opts: { wheel?: boolean } = {}) {
  const wheel = opts.wheel ?? true;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let acc = 0;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const now = performance.now();
      if (Math.abs(acc) >= 50 && now - last > 260) {
        stepMascot(acc > 0 ? 1 : -1);
        last = now;
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
      if (e.pointerType !== "mouse" && Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(e.clientY - y0) * 1.4) stepMascot(dx < 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        stepMascot(e.key === "ArrowRight" ? 1 : -1);
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
  }, [ref, wheel]);
}
