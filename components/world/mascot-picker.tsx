"use client";

import { useRef } from "react";
import { MASCOTS, setMascot, stepMascot, useMascot, useMascotGestures } from "@/lib/mascots";

// One small control, no menus: ‹ › step through the mascots. The wheel or touchpad scroll over it, a swipe, and the
// left / right arrow keys (while it has focus) do the same. The dice picks a random one each visit.
export function MascotPicker({ className = "" }: { className?: string; up?: boolean }) {
  const { choice, id } = useMascot();
  const box = useRef<HTMLDivElement>(null);
  useMascotGestures(box);
  const current = MASCOTS.find((m) => m.id === id) ?? MASCOTS[0];
  const btn = "grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-bold text-[var(--fg2)] transition hover:bg-[var(--fg)]/10 hover:text-[var(--fg)] active:scale-90";

  return (
    <div
      ref={box}
      tabIndex={0}
      role="group"
      aria-label="Mascota: usa las flechas izquierda y derecha, o la rueda del mouse, para cambiarla"
      title="Cambia con ← → , la rueda del mouse, el touchpad o deslizando"
      className={`fixed z-30 flex touch-pan-y select-none items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)]/90 p-0.5 shadow-lg backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon)] ${className}`}
    >
      <button type="button" onClick={() => stepMascot(-1)} aria-label="Mascota anterior" className={btn} tabIndex={-1}>
        ‹
      </button>
      <span key={id} className="pop-in flex min-w-[6.5rem] items-center justify-center gap-1.5 px-1 text-sm font-bold text-[var(--fg)]" aria-live="polite">
        <span aria-hidden className="text-lg leading-none">{choice === "auto" ? "🎲" : current.emoji}</span>
        <span className="truncate">{choice === "auto" ? "Al azar" : current.label}</span>
      </span>
      <button type="button" onClick={() => stepMascot(1)} aria-label="Mascota siguiente" className={btn} tabIndex={-1}>
        ›
      </button>
      <button
        type="button"
        onClick={() => setMascot(choice === "auto" ? id : "auto")}
        aria-label={choice === "auto" ? "Quedarme con esta mascota" : "Mascota al azar en cada visita"}
        aria-pressed={choice === "auto"}
        title={choice === "auto" ? "Al azar en cada visita (activo)" : "Al azar en cada visita"}
        className={`${btn} text-base ${choice === "auto" ? "bg-[var(--accent)] text-[var(--on-accent)]" : ""}`}
        tabIndex={-1}
      >
        🎲
      </button>
    </div>
  );
}
