import type { GameProfile } from "@/lib/game";
import { TIER_POINTS } from "@/lib/gamification";
import { CONQUER_TIER, TIERS } from "@/lib/ranks";
import { ConquestMap } from "./conquest-map";
import { AchievementCard } from "./achievement-card";
import { GameShell } from "./game-shell";
import { RankEmblem } from "./rank-emblem";
import { RankLadder } from "./rank-ladder";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";

const CATEGORIES = ["Estudio", "Combate", "Constancia", "Conquista"] as const;

export function AchievementsView({ profile: p }: { profile: GameProfile }) {
  const { rank, topics, achievements } = p;
  const maxPoints = achievements.length * TIER_POINTS.reduce((a, b) => a + b, 0);
  const conquered = topics.filter((t) => t.mastery.conquered).length;
  const done = achievements.filter((a) => a.tier > 0).length;

  return (
    <GameShell>
      {/* Header: rank */}
      <Reveal>
        <section className="hx-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-6">
            <RankEmblem tierIndex={rank.tierIndex} division={rank.division} size={168} />
            <div className="min-w-0 flex-1">
              <p className="hx-kicker">Rango actual</p>
              <h1 className="hx-title hx-gold-text text-4xl sm:text-5xl" style={{ ["--tg1" as string]: rank.tier.glow, ["--tg2" as string]: rank.tier.color, ["--tg3" as string]: rank.tier.glow }}>{rank.label}</h1>
              <div className="mt-3 flex items-center gap-3">
                <div className="hx-bar flex-1">
                  <span style={{ width: `${Math.max(rank.pct, 3)}%` }} />
                </div>
                <span className="font-bold tabular-nums text-[var(--neon)]">{rank.lp} LP</span>
              </div>
              <p className="hx-mute mt-2 text-sm">
                {rank.nextLabel ? (
                  <>
                    <b className="text-[var(--fg)]">{rank.toNext} XP</b> para <b className="text-[var(--hi)]">{rank.nextLabel}</b>
                  </>
                ) : (
                  "Estás en la cima de la liga."
                )}
              </p>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                <Stat label="Puntos de logro" value={`${p.achievementPoints}`} sub={`de ${maxPoints}`} />
                <Stat label="Logros" value={`${done}`} sub={`de ${achievements.length}`} />
                <Stat label="Temas conquistados" value={`${conquered}`} sub={`de ${topics.length}`} />
              </dl>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Ladder */}
      <Reveal>
        <div className="mt-8">
          <RankLadder tierIndex={rank.tierIndex} xp={rank.xp} />
        </div>
      </Reveal>

      {/* Conquest map */}
      <section className="mt-8" aria-label="Mapa de conquista">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="hx-kicker">Mapa de conquista</h2>
          <p className="hx-mute text-sm">Un tema se conquista al llegar a {TIERS[CONQUER_TIER].name}. Los aciertos pesan por tu precisión.</p>
        </div>
        <ConquestMap topics={topics} />
      </section>

      {/* Achievements */}
      {CATEGORIES.map((cat) => (
        <section key={cat} className="mt-8" aria-label={`Logros de ${cat}`}>
          <h2 className="hx-kicker mb-3">{cat}</h2>
          <Stagger className="grid gap-4 sm:grid-cols-2">
            {achievements
              .filter((a) => a.category === cat)
              .map((a) => (
                <StaggerItem key={a.id}>
                  <AchievementCard a={a} />
                </StaggerItem>
              ))}
          </Stagger>
        </section>
      ))}
    </GameShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[var(--fg)]/5 px-2 py-2">
      <dd className="hx-title text-2xl">{value}</dd>
      <dt className="hx-mute text-[0.62rem] font-bold uppercase tracking-wider">{label}</dt>
      <p className="hx-mute text-[0.6rem]">{sub}</p>
    </div>
  );
}
