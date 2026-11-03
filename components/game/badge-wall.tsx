import Link from "next/link";
import { AchievementIcon } from "./achievement-icon";
import { ACHIEVEMENTS, type AchievementState } from "@/lib/gamification";

const SHOWN = 6;

// Earned achievements as small plaques (the way old chat-room badges were shown): a bevelled tile with the medal,
// the name and what it took to earn it. Only what is won is listed; the full wall lives in /logros.
export function BadgeWall({ achievements }: { achievements: AchievementState[] }) {
  const earned = achievements
    .filter((a) => a.tier > 0)
    .sort((a, b) => b.tier - a.tier || b.points - a.points);
  const shown = earned.slice(0, SHOWN);
  const points = achievements.reduce((n, a) => n + a.points, 0);

  return (
    <section aria-label="Placas conseguidas" className="hx-panel mb-6 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="hx-kicker">
          Placas <span className="hx-mute">· {earned.length}/{achievements.length}</span>
        </h2>
        <Link href="/logros" className="text-sm font-semibold text-[var(--accent)] hover:underline">
          Ver todas · {points} pts →
        </Link>
      </div>

      {shown.length === 0 ? (
        <p className="hx-mute mt-3 text-sm">Todavía no tienes placas. Termina un quiz para ganar la primera.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((a) => {
            const def = ACHIEVEMENTS.find((d) => d.id === a.id);
            const what = def ? def.text(a.prev) : a.text;
            return (
              <li
                key={a.id}
                className="badge-plaque flex items-center gap-3 rounded-xl p-2 pr-3"
                style={{ ["--ac" as string]: a.rarity.color }}
              >
                <span className="badge-tile grid h-12 w-12 shrink-0 place-items-center rounded-lg">
                  <AchievementIcon id={a.id} color={a.rarity.color} tier={a.tier} size={38} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold leading-tight">
                    {a.name} <span className="text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: a.rarity.color }}>· Nv {a.tier}</span>
                  </p>
                  <p className="hx-mute line-clamp-2 text-xs leading-snug">{what}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {earned.length > SHOWN && (
        <p className="hx-mute mt-2 text-xs">+{earned.length - SHOWN} placas más en tu colección.</p>
      )}
    </section>
  );
}
