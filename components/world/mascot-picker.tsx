"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MASCOTS, setMascot, useMascot } from "@/lib/mascots";

// One compact chip (current mascot) with quick ‹ › on wide screens. It opens a grid of big, labelled tiles:
// a bottom sheet on phones (thumb reach, 48px targets) and a popover on larger screens. One tap picks and closes.
export function MascotPicker({ className = "", up = false }: { className?: string; up?: boolean }) {
  const { choice, id } = useMascot();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // Where the popover goes on wide screens (the panel lives in <body>, so no transformed or clipped parent can break it).
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const index = Math.max(0, MASCOTS.findIndex((m) => m.id === id));
  const current = MASCOTS[index];
  const step = (d: number) => setMascot(MASCOTS[(index + d + MASCOTS.length) % MASCOTS.length].id);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !panel.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open && box.current && window.innerWidth >= 640) {
      const r = box.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const right = Math.max(8, window.innerWidth - r.right);
      setPos(up || below < 300 ? { bottom: window.innerHeight - r.top + 8, right } : { top: r.bottom + 8, right });
    }
    setOpen((o) => !o);
  }

  const arrow =
    "hidden h-9 w-8 place-items-center rounded-full text-lg font-bold text-[var(--fg2)] transition hover:bg-[var(--fg)]/10 hover:text-[var(--fg)] sm:grid";
  const tile = (active: boolean) =>
    `flex min-h-[3.4rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-center transition ${
      active ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-md" : "hover:bg-[var(--fg)]/10 active:bg-[var(--fg)]/15"
    }`;

  return (
    <div ref={box} className={`fixed z-30 ${className}`}>
      <div className="flex items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)]/90 p-0.5 shadow-lg backdrop-blur-md">
        <button type="button" onClick={() => step(-1)} aria-label="Mascota anterior" className={arrow}>
          ‹
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="dialog"
          title="Elegir mascota"
          className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-[var(--fg)] transition hover:bg-[var(--fg)]/10"
        >
          <span aria-hidden className="text-lg leading-none">
            {choice === "auto" ? "🎲" : current.emoji}
          </span>
          <span className="max-w-[6.5rem] truncate">{choice === "auto" ? "Al azar" : current.label}</span>
          <span aria-hidden className={`text-[10px] transition ${open ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>
        <button type="button" onClick={() => step(1)} aria-label="Mascota siguiente" className={arrow}>
          ›
        </button>
      </div>

      {open &&
        createPortal(
          <>
          <div aria-hidden className="fixed inset-0 z-[60] bg-black/40 sm:hidden" />
          <div
            ref={panel}
            role="dialog"
            aria-label="Elegir mascota"
            style={pos ? { top: pos.top, bottom: pos.bottom, right: pos.right } : undefined}
            className="hx fixed inset-x-0 bottom-0 z-[61] max-h-[70dvh] overflow-y-auto rounded-t-3xl border border-[var(--line-strong)] bg-[var(--surface)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl sm:inset-x-auto sm:bottom-auto sm:max-h-[min(60dvh,26rem)] sm:w-[19rem] sm:rounded-2xl"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-bold">Tu mascota</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-lg text-[var(--mute)] hover:bg-[var(--fg)]/10 sm:hidden">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 sm:grid-cols-4">
              <button
                type="button"
                aria-pressed={choice === "auto"}
                onClick={() => {
                  setMascot("auto");
                  setOpen(false);
                }}
                className={tile(choice === "auto")}
              >
                <span aria-hidden className="text-2xl leading-none">🎲</span>
                <span className="text-[11px] font-semibold leading-tight">Al azar</span>
              </button>
              {MASCOTS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={choice === m.id}
                  onClick={() => {
                    setMascot(m.id);
                    setOpen(false);
                  }}
                  className={tile(choice === m.id)}
                >
                  <span aria-hidden className="text-2xl leading-none">{m.emoji}</span>
                  <span className="w-full truncate text-[11px] font-semibold leading-tight">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          </>,
          document.body,
        )}
    </div>
  );
}
