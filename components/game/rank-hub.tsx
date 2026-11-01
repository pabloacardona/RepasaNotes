import Link from "next/link";
import type { GameProfile } from "@/lib/game";
import { RankEmblem } from "./rank-emblem";

// Player card for the dashboard: rank, XP bar and streak. Nothing else.
export function RankHub({ profile }: { profile: GameProfile }) {
  const { rank, streak, achievementPoints } = profile;
  const unlocked = profile.achievements.filter((a) => a.tier > 0).length;

  return (
    <section aria-label="Tu rango" className="hx mb-6">
      <div className="hx-panel flex flex-wrap items-center gap-5 p-5">
        <RankEmblem tierIndex={rank.tierIndex} division={rank.division} size={104} />
        <div className="min-w-0 flex-1">
          <p className="hx-kicker">Tu rango</p>
          <p className="hx-title hx-rank mt-1 text-4xl" style={{ ["--tg2" as string]: rank.tier.color }}>
            {rank.label}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="hx-bar flex-1" role="progressbar" aria-valuenow={rank.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso al siguiente rango">
              <span style={{ width: `${Math.max(rank.pct, 3)}%` }} />
            </div>
            <span className="font-[family-name:var(--font-press)] text-[0.6rem]">{rank.xp} XP</span>
          </div>
          <p className="hx-mute mt-2">
            {rank.nextLabel ? (
              <>
                Faltan <b className="text-[var(--fg)]">{rank.toNext} XP</b> para {rank.nextLabel}
              </>
            ) : (
              "Estás en la cima."
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="hx-panel hx-panel-soft px-4 py-3 text-center">
            <p className="text-3xl" aria-hidden>
              🔥
            </p>
            <p className="font-[family-name:var(--font-press)] text-sm">{streak.current}</p>
            <p className="hx-mute text-sm">{streak.current === 1 ? "día" : "días"}</p>
          </div>
          <Link href="/logros" className="hx-panel hx-panel-soft hx-lift px-4 py-3 text-center">
            <p className="text-3xl" aria-hidden>
              🏆
            </p>
            <p className="font-[family-name:var(--font-press)] text-sm">{unlocked}</p>
            <p className="hx-mute text-sm">logros · {achievementPoints} pts</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
