import { useSyncExternalStore } from "react";
import type { MascotSlot } from "./mascots";

// Where each companion stands and how big it is, chosen by the player and kept in this browser.
// `x` and `y` are the bottom-centre of the mascot as a fraction of the window (0 to 1), so the spot survives a resize or a
// rotation. `scale` multiplies the default size. With no saved spot the mascot stays in the place its page gives it.
export type CompanionLayout = { x: number | null; y: number | null; scale: number };

export const SCALES = [0.75, 1, 1.3, 1.6] as const;
const DEFAULT: CompanionLayout = { x: null, y: null, scale: 1 };
const KEYS: Record<MascotSlot, string> = { main: "repasa_pos", baby: "repasa_pos_baby" };
const EVENT = "repasa-layout";

const cache: Partial<Record<MascotSlot, { raw: string | null; value: CompanionLayout }>> = {};

function parse(raw: string | null): CompanionLayout {
  if (!raw) return DEFAULT;
  try {
    const v = JSON.parse(raw) as Partial<CompanionLayout>;
    const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null);
    const scale = typeof v.scale === "number" && v.scale >= 0.5 && v.scale <= 2 ? v.scale : 1;
    const x = num(v.x);
    const y = num(v.y);
    return x === null || y === null ? { x: null, y: null, scale } : { x, y, scale };
  } catch {
    return DEFAULT;
  }
}

/** The saved layout. Returns the same object until the stored text changes, which useSyncExternalStore needs. */
export function readLayout(slot: MascotSlot): CompanionLayout {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEYS[slot]);
  } catch {}
  const hit = cache[slot];
  if (hit && hit.raw === raw) return hit.value;
  const value = parse(raw);
  cache[slot] = { raw, value };
  return value;
}

export function saveLayout(slot: MascotSlot, next: Partial<CompanionLayout>) {
  const merged = { ...readLayout(slot), ...next };
  try {
    if (merged.x === null && merged.scale === 1) localStorage.removeItem(KEYS[slot]);
    else localStorage.setItem(KEYS[slot], JSON.stringify(merged));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Puts a companion back where its page puts it, at its normal size. */
export const resetLayout = (slot: MascotSlot) => saveLayout(slot, { x: null, y: null, scale: 1 });

/** Next size in the S, M, L, XL cycle. */
export function cycleScale(slot: MascotSlot) {
  const i = SCALES.findIndex((s) => Math.abs(s - readLayout(slot).scale) < 0.01);
  saveLayout(slot, { scale: SCALES[(i + 1) % SCALES.length] });
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

export function useCompanionLayout(slot: MascotSlot): CompanionLayout {
  return useSyncExternalStore(subscribe, () => readLayout(slot), () => DEFAULT);
}

/**
 * Applies a layout to a stage element. Written straight to the style so dragging never re-renders the 3D canvas.
 * A saved spot makes the element fixed, anchored by its bottom-centre and kept fully inside the window.
 */
export function placeCompanion(el: HTMLElement, layout: CompanionLayout) {
  const s = el.style;
  s.transformOrigin = "50% 100%";
  if (layout.x === null || layout.y === null) {
    for (const p of ["position", "left", "top", "right", "bottom", "margin"] as const) s[p] = "";
    s.transform = layout.scale === 1 ? "" : `scale(${layout.scale})`;
    return;
  }
  // Size without the scale (offsetWidth ignores transforms), so the clamp uses the real footprint.
  const w = el.offsetWidth * layout.scale;
  const h = el.offsetHeight * layout.scale;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const x = Math.min(Math.max(layout.x * vw, w / 2), Math.max(w / 2, vw - w / 2));
  const y = Math.min(Math.max(layout.y * vh, h), Math.max(h, vh));
  s.position = "fixed";
  s.left = `${x}px`;
  s.top = `${y}px`;
  s.right = "auto";
  s.bottom = "auto";
  s.margin = "0";
  s.transform = `translate(-50%, -100%) scale(${layout.scale})`;
}
