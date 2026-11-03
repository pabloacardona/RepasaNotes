import Link from "next/link";
import { AchievementIcon } from "./achievement-icon";
import { ACHIEVEMENTS, type AchievementState } from "@/lib/gamification";

// Collectible plaques: one slot per achievement, always in the same place, so the wall reads like a collection.
// Won ones show their medal in the rarity colour with the level pips underneath; the rest wait as dark silhouettes.
// Hover (or focus) a plaque for its title, what earned it and how far the next level is.
export function BadgeWall({ achievements }: { achievements: AchievementState[] }) {
  const earned = achievements.filter((a) => a.tier > 0).length;
  const levels = achievements.reduce((n, a) => n + a.tier, 0);
  const maxLevels = achievements.length * 4;
  const points = achievements.reduce((n, a) => n + a.points, 0);

  // The plaque that is closest to its next level: a goal to chase.
  const progress = (a: AchievementState) => (a.complete ? -1 : (a.value - a.prev) / Math.max(1, a.goal - a.prev));
  const nearest = [...achievements].sort((a, b) => progress(b) - progress(a))[0];

  return (
    <section aria-label="Colección de placas" className="hx-panel mb-6 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="hx-kicker">
          Colección <span className="hx-mute">· {earned}/{achievements.length} placas · {points} pts</span>
        </h2>
        <Link href="/logros" className="text-sm font-semibold text-[var(--accent)] hover:underline">
          Ver todas →
        </Link>
      </div>
      <div className="hx-bar mt-2 !h-2" role="progressbar" aria-valuenow={levels} aria-valuemin={0} aria-valuemax={maxLevels} aria-label="Niveles de placas conseguidos">
        <span style={{ width: `${Math.max((levels / maxLevels) * 100, 2)}%` }} />
      </div>

      <ul className="mt-4 grid grid-cols-5 gap-x-2 gap-y-4 sm:grid-cols-10">
        {achievements.map((a, i) => {
          const def = ACHIEVEMENTS.find((d) => d.id === a.id);
          const locked = a.tier === 0;
          const mobile = i % 5 === 0 ? "left-0" : i % 5 === 4 ? "right-0" : "left-1/2 -translate-x-1/2";
          const wide =
            i < 2
              ? "sm:left-0 sm:right-auto sm:translate-x-0"
              : i > 7
                ? "sm:right-0 sm:left-auto sm:translate-x-0"
                : "sm:left-1/2 sm:right-auto sm:-translate-x-1/2";
          const pct = Math.round(progress(a) * 100);
          return (
            <li key={a.id} className="badge-slot group relative flex flex-col items-center gap-1.5" style={{ ["--ac" as string]: a.rarity.color }}>
              <button
                type="button"
                aria-label={`${a.name}, nivel ${a.tier} de 4`}
                className={`badge-tile grid h-12 w-12 place-items-center rounded-xl sm:h-[52px] sm:w-[52px] ${locked ? "badge-locked" : "badge-won"} ${a.complete ? "badge-gold" : ""}`}
              >
                <AchievementIcon id={a.id} color={a.rarity.color} tier={a.tier} size={38} locked={locked} />
              </button>
              <span className="flex items-center gap-[3px]" aria-hidden>
                {[1, 2, 3, 4].map((t) => (
                  <span key={t} className="h-1.5 w-1.5 rounded-full" style={{ background: t <= a.tier ? a.rarity.color : "var(--track)" }} />
                ))}
              </span>
              <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${locked ? "hx-mute" : ""}`} style={locked ? undefined : { color: a.rarity.color }}>
                Nv {a.tier}
              </span>

              <div role="tooltip" className={`badge-tip pointer-events-none absolute bottom-full z-30 mb-2 w-56 rounded-xl p-3 text-left ${mobile} ${wide}`}>
                <p className="text-sm font-bold leading-tight">{a.name}</p>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: locked ? "var(--mute)" : a.rarity.color }}>
                  {locked ? "Sin conseguir" : `${a.rarity.name} · Nivel ${a.tier}/4`}
                </p>
                {def && a.tier > 0 && <p className="mt-1.5 text-xs">✓ {def.text(a.prev)}</p>}
                {a.complete ? (
                  <p className="mt-1.5 text-xs font-semibold text-[var(--hi)]">Colección completa</p>
                ) : (
                  <div className="mt-1.5">
                    <p className="hx-mute text-xs">Siguiente: {a.text}</p>
                    <div className="hx-bar mt-1.5 !h-1.5">
                      <span style={{ width: `${Math.max(pct, 4)}%` }} />
                    </div>
                    <p className="hx-mute mt-1 text-[0.65rem] tabular-nums">
                      {a.value}/{a.goal}
                    </p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {nearest && !nearest.complete && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm">
          <span aria-hidden>🎯</span>
          <span className="hx-mute">Más cerca:</span>
          <b>{nearest.name}</b>
          <span className="hx-mute">
            — {nearest.text} ({nearest.value}/{nearest.goal})
          </span>
        </p>
      )}
    </section>
  );
}
