import Link from "next/link";
import type { GameProfile } from "@/lib/game";
import { TIER_POINTS, type AchievementState } from "@/lib/gamification";
import { CONQUER_TIER, TIERS } from "@/lib/ranks";
import { GameShell } from "./game-shell";
import { RankEmblem } from "./rank-emblem";
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
        <section className="mt-8" aria-label="Escalera de rangos">
          <h2 className="hx-kicker mb-3">La escalera</h2>
          <div className="hx-panel hx-panel-soft overflow-x-auto p-4">
            <ol className="flex min-w-[720px] items-end justify-between gap-2">
              {TIERS.map((t, i) => {
                const reached = i <= rank.tierIndex;
                const current = i === rank.tierIndex;
                return (
                  <li key={t.id} className={`flex flex-1 flex-col items-center gap-1 text-center ${reached ? "" : "opacity-40"}`}>
                    <div className={current ? "-translate-y-2 scale-125 transition" : ""}>
                      <RankEmblem tierIndex={i} division={current ? rank.division : null} size={current ? 72 : 56} locked={!reached} />
                    </div>
                    <span className={`font-display text-[0.65rem] font-bold uppercase tracking-wider ${current ? "text-[var(--hi)]" : ""}`}>{t.name}</span>
                    <span className="hx-mute text-[0.6rem]">{t.min.toLocaleString("es-CO")} XP</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      </Reveal>

      {/* Conquest map */}
      <section className="mt-8" aria-label="Mapa de conquista">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="hx-kicker">Mapa de conquista</h2>
          <p className="hx-mute text-sm">Un tema se conquista al llegar a {TIERS[CONQUER_TIER].name}. Los aciertos pesan por tu precisión.</p>
        </div>
        {topics.length === 0 ? (
          <div className="hx-panel mt-3 p-8 text-center">
            <p className="hx-title text-xl">Territorio sin explorar</p>
            <p className="hx-mute mt-2">Resuelve quizzes de un tema para empezar a conquistarlo.</p>
            <Link href="/quizzes/nuevo" className="hx-btn hx-btn-gold mt-5">
              Nuevo quiz
            </Link>
          </div>
        ) : (
          <Stagger className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <StaggerItem key={t.topic}>
                <div className="hx-panel hx-lift h-full p-4">
                  <div className="flex items-center gap-3">
                    <RankEmblem tierIndex={t.mastery.tierIndex} size={64} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{t.topic}</p>
                      <p className="font-display text-sm font-bold uppercase tracking-wider" style={{ color: t.mastery.tier.glow }}>
                        {t.mastery.tier.name}
                      </p>
                      <p className="hx-mute text-xs">
                        {t.correct}/{t.answered} aciertos
                      </p>
                    </div>
                  </div>
                  <div className="hx-bar mt-3">
                    <span style={{ width: `${Math.max(t.mastery.pct, 3)}%` }} />
                  </div>
                  <p className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="hx-mute">{t.mastery.nextName ? `Siguiente: ${t.mastery.nextName}` : "Dominio total"}</span>
                    {t.mastery.conquered ? <span className="font-bold text-[var(--ok)]">🏰 Conquistado</span> : <span className="hx-mute">{t.mastery.pct}%</span>}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        )}
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

function AchievementCard({ a }: { a: AchievementState }) {
  const locked = a.tier === 0;
  const pct = a.complete ? 100 : Math.round(((a.value - a.prev) / (a.goal - a.prev)) * 100);
  return (
    <div className={`hx-panel hx-lift h-full p-4 ${locked ? "opacity-80" : ""}`} style={{ ["--ac" as string]: a.rarity.color }}>
      <div className="flex gap-3">
        <div
          className={`grid h-16 w-16 shrink-0 place-items-center text-3xl ${locked ? "grayscale" : "hx-glow"}`}
          style={{
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), rgba(0,0,0,0.4))",
            border: `2px solid ${locked ? "var(--line-strong)" : a.rarity.color}`,
            clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
            ["--glow" as string]: a.rarity.color,
          }}
        >
          <span aria-hidden className={locked ? "opacity-40" : ""}>
            {locked ? "🔒" : a.emoji}
          </span>
        </div>
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
              style={{ background: t <= a.tier ? a.rarity.color : "rgba(255,255,255,0.12)", boxShadow: t <= a.tier ? `0 0 8px ${a.rarity.color}` : "none" }}
            />
          ))}
        </ol>
        <div className="hx-bar hx-bar-gold flex-1">
          <span style={{ width: `${Math.max(pct, 3)}%` }} />
        </div>
        <span className="hx-mute text-xs font-bold tabular-nums">
          {a.complete ? "MAX" : `${a.value}/${a.goal}`}
        </span>
      </div>
    </div>
  );
}
