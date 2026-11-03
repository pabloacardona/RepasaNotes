"use client";

import { useState } from "react";
import { AchievementIcon } from "./achievement-icon";
import { ACHIEVEMENTS, RARITIES, TIER_POINTS, type AchievementState } from "@/lib/gamification";

const TIER_RARITY = [0, 0, 2, 3, 4] as const;

// One achievement. Click it to open the plaques that come next and what each one asks for.
export function AchievementCard({ a }: { a: AchievementState }) {
  const [open, setOpen] = useState(false);
  const def = ACHIEVEMENTS.find((d) => d.id === a.id);
  const locked = a.tier === 0;
  const pct = a.complete ? 100 : Math.round(((a.value - a.prev) / (a.goal - a.prev)) * 100);
  const upcoming = [1, 2, 3, 4].filter((t) => t > a.tier);

  return (
    <div className={`hx-panel hx-lift h-full p-4 ${locked ? "opacity-90" : ""}`} style={{ ["--ac" as string]: a.rarity.color }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="block w-full text-left">
        <div className="flex gap-3">
          <AchievementIcon id={a.id} color={a.rarity.color} tier={a.tier} size={68} locked={locked} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold">{a.name}</p>
              <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--hi)]">{a.points} pts</span>
            </div>
            <p className="text-[0.68rem] font-bold uppercase tracking-widest" style={{ color: locked ? "var(--mute)" : a.rarity.color }}>
              {locked ? "Bloqueado" : a.rarity.name}
            </p>
            <p className="hx-mute mt-1 text-sm">{a.complete ? "¡Completado en todos sus niveles!" : a.text}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ol className="flex gap-1" aria-label={`Nivel ${a.tier} de 4`}>
            {[1, 2, 3, 4].map((t) => (
              <li
                key={t}
                className="h-3 w-3 rotate-45"
                style={{ background: t <= a.tier ? a.rarity.color : "var(--track)", boxShadow: t <= a.tier ? `0 0 8px ${a.rarity.color}` : "none" }}
              />
            ))}
          </ol>
          <div className="hx-bar hx-bar-gold flex-1">
            <span style={{ width: `${Math.max(pct, 3)}%` }} />
          </div>
          <span className="hx-mute text-xs font-bold tabular-nums">{a.complete ? "MAX" : `${a.value}/${a.goal}`}</span>
        </div>
        <p className="hx-mute mt-2 text-[0.7rem]">{open ? "▲ Ocultar" : a.complete ? "▼ Ver placas" : "▼ Ver las placas que siguen"}</p>
      </button>

      {open && def && (
        <div className="mt-2 border-t border-[var(--line)] pt-3">
          {upcoming.length === 0 ? (
            <p className="text-sm font-semibold text-[var(--hi)]">Conquistaste todos los niveles de esta placa.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((t) => {
                const rar = RARITIES[TIER_RARITY[t]];
                const next = t === a.tier + 1;
                return (
                  <li key={t} className="flex items-center gap-3">
                    <span className="badge-tile badge-won grid h-11 w-11 shrink-0 place-items-center rounded-lg" style={{ ["--ac" as string]: rar.color }}>
                      <AchievementIcon id={a.id} color={rar.color} tier={t} size={34} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: rar.color }}>
                        Nv {t} · {rar.name}
                        {next && <span className="hx-mute"> · siguiente</span>}
                      </p>
                      <p className="text-sm leading-snug">{def.text(def.goals[t - 1])}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--hi)]">+{TIER_POINTS[t - 1]} pts</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
