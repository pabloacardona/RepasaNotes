"use client";

import { useRef } from "react";
import { MASCOTS, randomizeMascot, stepMascot, useMascot, useMascotGestures, type MascotSlot } from "@/lib/mascots";

// One small control, no menus: ‹ › step through the mascots. The wheel or touchpad scroll over it, a swipe, and the
// left / right arrow keys (while it has focus) do the same. The dice picks a different random mascot right away.
export function MascotPicker({ className = "", slot = "main", compact = false }: { className?: string; slot?: MascotSlot; compact?: boolean; up?: boolean }) {
  const { id } = useMascot(slot);
  const box = useRef<HTMLDivElement>(null);
  useMascotGestures(box, { slot });
  const current = MASCOTS.find((m) => m.id === id) ?? MASCOTS[0];
  const btn = `grid shrink-0 place-items-center rounded-full font-bold text-[var(--fg2)] transition hover:bg-[var(--fg)]/10 hover:text-[var(--fg)] active:scale-90 ${compact ? "h-7 w-7 text-base" : "h-9 w-9 text-lg"}`;
  const label = slot === "baby" ? "Mascota bebé" : "Mascota";

  return (
    <div
      ref={box}
      tabIndex={0}
      role="group"
      aria-label={`${label}: usa las flechas izquierda y derecha, o la rueda del mouse, para cambiarla`}
      title="Cambia con ← → , la rueda del mouse, el touchpad o deslizando"
      className={`fixed z-30 flex touch-pan-y select-none items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)]/90 p-0.5 shadow-lg backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon)] ${className}`}
    >
      <button type="button" onClick={() => stepMascot(-1, slot)} aria-label={`${label} anterior`} className={btn} tabIndex={-1}>
        ‹
      </button>
      <span key={id} className={`pop-in flex items-center justify-center gap-1.5 px-1 font-bold text-[var(--fg)] ${compact ? "min-w-[4.5rem] text-xs" : "min-w-[6.5rem] text-sm"}`} aria-live="polite">
        <span aria-hidden className={compact ? "text-base leading-none" : "text-lg leading-none"}>{current.emoji}</span>
        <span className="truncate">{current.label}</span>
      </span>
      <button type="button" onClick={() => stepMascot(1, slot)} aria-label={`${label} siguiente`} className={btn} tabIndex={-1}>
        ›
      </button>
      <button type="button" onClick={() => randomizeMascot(slot)} aria-label={`${label} al azar`} title="Una mascota al azar" className={btn} tabIndex={-1}>
        🎲
      </button>
    </div>
  );
}
