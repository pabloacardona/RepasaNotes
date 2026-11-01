import Link from "next/link";
import { DAILY_BONUS_XP } from "@/lib/gamification";
import type { GameProfile } from "@/lib/game";
import { RankEmblem } from "./rank-emblem";

const DAY = ["L", "M", "X", "J", "V", "S", "D"];
const dayLetter = (date: string) => DAY[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7];

// Player card for the dashboard, in the hextech style: rank, streak, daily missions, conquests and achievements.
export function RankHub({ profile }: { profile: GameProfile }) {
  const { rank, streak, quests, week, topics, achievements, achievementPoints } = profile;
  const recent = achievements.filter((a) => a.tier > 0).sort((a, b) => b.tier - a.tier).slice(0, 4);
  const conquered = topics.filter((t) => t.mastery.conquered).length;

  return (
    <section aria-label="Tu rango" className="hx mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="hx-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-5">
          <RankEmblem tierIndex={rank.tierIndex} division={rank.division} size={132} />
          <div className="min-w-0 flex-1">
            <p className="hx-kicker">Tu rango</p>
            <p className="hx-title hx-gold-text hx-rank text-3xl sm:text-4xl" style={{ ["--tg1" as string]: rank.tier.glow, ["--tg2" as string]: rank.tier.color, ["--tg3" as string]: rank.tier.glow }}>{rank.label}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="hx-bar flex-1" role="progressbar" aria-valuenow={rank.lp} aria-valuemin={0} aria-valuemax={100} aria-label="Puntos de liga">
                <span style={{ width: `${Math.max(rank.pct, 3)}%` }} />
              </div>
              <span className="font-bold tabular-nums text-[var(--neon)]">{rank.lp} LP</span>
            </div>
            <p className="hx-mute mt-1.5 text-sm">
              {rank.nextLabel ? (
                <>
                  Te faltan <b className="text-[var(--fg)]">{rank.toNext} XP</b> para <b className="text-[var(--hi)]">{rank.nextLabel}</b>
                </>
              ) : (
                "Estás en la cima de la liga."
              )}{" "}
              · {rank.xp.toLocaleString("es-CO")} XP en total
            </p>
          </div>
        </div>

        <div className="hx-rule my-4">
          <span />
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className={`text-4xl ${streak.activeToday && streak.current > 0 ? "animate-pulse" : "grayscale"}`} aria-hidden>
              🔥
            </p>
            <p className="font-display text-xl font-black leading-none">{streak.current}</p>
            <p className="hx-mute text-[0.6rem] font-bold uppercase tracking-widest">días</p>
          </div>
          <div className="flex-1">
            <div className="flex justify-between gap-1">
              {week.map((d, i) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className={`grid h-7 w-7 rotate-45 place-items-center text-sm font-bold ${
                      d.count > 0 ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-[0_0_14px_rgba(200,170,110,0.7)]" : "bg-[var(--fg)]/10 text-[var(--mute)]"
                    } ${i === week.length - 1 ? "outline outline-2 outline-[var(--neon)]" : ""}`}
                    title={`${d.date}: ${d.count} respuestas`}
                  >
                    <span className="-rotate-45">{d.count > 0 ? "✓" : ""}</span>
                  </span>
                  <span className="hx-mute mt-1 text-[0.65rem] font-bold">{dayLetter(d.date)}</span>
                </div>
              ))}
            </div>
            <p className="hx-mute mt-1 text-xs">
              {streak.activeToday ? "¡Hoy ya sumaste!" : streak.current > 0 ? "Responde hoy para mantener la racha." : "Responde hoy para empezar una racha."} Mejor racha: {streak.best}
            </p>
          </div>
        </div>
      </div>

      <div className="hx-panel p-5 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="hx-kicker">Misiones de hoy</p>
            <p className="hx-mute text-sm">
              Responde {quests[0].goal} preguntas: +{DAILY_BONUS_XP} XP extra.
            </p>
          </div>
          <span className="hx-title text-lg">
            {quests.filter((q) => q.done).length}/{quests.length}
          </span>
        </div>
        <ul className="mt-4 space-y-3">
          {quests.map((q) => (
            <li key={q.id}>
              <div className="flex items-center gap-2">
                <span aria-hidden>{q.done ? "✅" : q.emoji}</span>
                <p className={`flex-1 text-sm font-bold ${q.done ? "text-[var(--ok)]" : ""}`}>{q.label}</p>
                <span className="hx-mute text-sm font-bold tabular-nums">
                  {q.value}/{q.goal}
                </span>
              </div>
              <div className={`hx-bar mt-1 ${q.done ? "" : "hx-bar-gold"}`}>
                <span style={{ width: `${Math.max((q.value / q.goal) * 100, 2)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="hx-panel p-5 sm:p-6 lg:col-span-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="hx-kicker">Conquistas y logros</p>
          <p className="hx-mute text-sm">
            <b className="text-[var(--hi)]">{achievementPoints}</b> puntos de logro · <b className="text-[var(--fg)]">{conquered}</b>{" "}
            {conquered === 1 ? "tema conquistado" : "temas conquistados"}
          </p>
        </div>
        {recent.length === 0 ? (
          <p className="hx-mute mt-3">Termina tu primer quiz para desbloquear tu primer logro.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center gap-3 bg-[var(--fg)]/5 p-3" style={{ borderLeft: `3px solid ${a.rarity.color}` }}>
                <span aria-hidden className="text-3xl">
                  {a.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{a.name}</span>
                  <span className="block text-xs font-bold uppercase tracking-wider" style={{ color: a.rarity.color }}>
                    {a.rarity.name}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/logros" className="hx-btn hx-btn-gold mt-4 !px-5 !py-2 text-sm">
          Ver todos los logros
        </Link>
      </div>
    </section>
  );
}
