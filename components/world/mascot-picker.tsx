"use client";

import { useEffect, useRef, useState } from "react";
import { MASCOTS, setMascot, useMascot } from "@/lib/mascots";

// Quick mascot switch: ‹ › step through the monsters, the middle button opens a grid of faces (one tap to pick),
// and the dice draws a random one. The grid closes on a pick, on Escape or on a click outside.
export function MascotPicker({ className = "", up = false }: { className?: string; up?: boolean }) {
  const { choice, id } = useMascot();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const index = Math.max(0, MASCOTS.findIndex((m) => m.id === id));
  const current = MASCOTS[index];
  const step = (d: number) => setMascot(MASCOTS[(index + d + MASCOTS.length) % MASCOTS.length].id);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const arrow =
    "grid h-8 w-8 place-items-center rounded-full text-lg font-bold text-[var(--fg2)] transition hover:bg-[var(--fg)]/10 hover:text-[var(--fg)]";

  return (
    <div ref={box} className={`fixed z-30 ${className}`}>
      <div className="flex items-center gap-0.5 rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)]/90 p-0.5 shadow-lg backdrop-blur-md">
        <button type="button" onClick={() => step(-1)} aria-label="Mascota anterior" className={arrow}>
          ‹
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="true"
          title="Elegir mascota"
          className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-bold text-[var(--fg)] transition hover:bg-[var(--fg)]/10"
        >
          <span aria-hidden className="text-base">
            {current.emoji}
          </span>
          {current.label}
        </button>
        <button type="button" onClick={() => step(1)} aria-label="Mascota siguiente" className={arrow}>
          ›
        </button>
      </div>

      {open && (
        <div className={`absolute right-0 w-[min(15rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)]/95 p-2 shadow-2xl backdrop-blur-xl ${up ? "bottom-full mb-2" : "mt-2"}`}>
          <div className="grid grid-cols-5 gap-1">
            {MASCOTS.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.label}
                aria-label={m.label}
                aria-pressed={choice === m.id}
                onClick={() => {
                  setMascot(m.id);
                  setOpen(false);
                }}
                className={`grid aspect-square place-items-center rounded-xl text-xl transition ${
                  choice === m.id ? "bg-[var(--accent)]" : "hover:bg-[var(--fg)]/10"
                }`}
              >
                {m.emoji}
              </button>
            ))}
            <button
              type="button"
              title="Sorpresa: una al azar"
              aria-label="Sorpresa"
              aria-pressed={choice === "auto"}
              onClick={() => {
                setMascot("auto");
                setOpen(false);
              }}
              className={`grid aspect-square place-items-center rounded-xl text-xl transition ${
                choice === "auto" ? "bg-[var(--accent)]" : "hover:bg-[var(--fg)]/10"
              }`}
            >
              🎲
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
