"use client";

import { useState } from "react";
import { MASCOTS, setMascot, useMascot } from "@/lib/mascots";

// Small floating menu to pick which monster plays Repi. "Sorpresa" draws one at random on every visit.
export function MascotPicker({ className = "" }: { className?: string }) {
  const { choice, id } = useMascot();
  const [open, setOpen] = useState(false);
  const current = MASCOTS.find((m) => m.id === id)!;

  return (
    <div className={`fixed z-30 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="inline-flex items-center gap-2 rounded-full bg-ink/75 px-3.5 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-ink/90 focus-visible:outline-3 focus-visible:outline-blue"
      >
        <span aria-hidden>{current.emoji}</span>
        Cambiar mascota
      </button>
      {open && (
        <div className="mt-2 max-h-[60dvh] w-[min(18rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-white/50 bg-paper/95 p-2 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setMascot("auto")}
            aria-pressed={choice === "auto"}
            className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-bold transition ${
              choice === "auto" ? "bg-yellow" : "hover:bg-blue-soft"
            }`}
          >
            <span aria-hidden>🎲</span> Sorpresa
          </button>
          <div className="grid grid-cols-2 gap-1">
            {MASCOTS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMascot(m.id)}
                aria-pressed={choice === m.id}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                  choice === m.id ? "bg-yellow font-bold" : "hover:bg-blue-soft"
                }`}
              >
                <span aria-hidden>{m.emoji}</span> {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
