import { Card } from "@/components/ui";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { AnimatedBar } from "@/components/motion/animated-bar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { DAILY_BONUS_XP } from "@/lib/gamification";
import type { GameProfile } from "@/lib/game";
import { LevelRing } from "./level-ring";

const DAY = ["L", "M", "X", "J", "V", "S", "D"];
const dayLetter = (date: string) => DAY[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7];

// Player card for the dashboard: level, streak, daily quests and badges.
export function GameHub({ profile }: { profile: GameProfile }) {
  const { level, streak, quests, badges, week } = profile;
  const unlocked = badges.filter((b) => b.unlocked).length;
  const questsDone = quests.filter((q) => q.done).length;

  return (
    <section aria-label="Tu progreso de juego" className="mb-6 space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* Level + streak */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#1b2150] via-[#2a2a7a] to-[#4a2a8a] p-5 text-white shadow-xl sm:p-6">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-yellow/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-5">
            <LevelRing level={level.level} pct={level.pct} size={112} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-yellow">{level.title}</p>
              <p className="font-display text-3xl font-extrabold">
                <AnimatedNumber from={0} value={level.xp} /> <span className="text-lg font-bold text-white/70">XP</span>
              </p>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={level.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso al siguiente nivel">
                <AnimatedBar percent={level.pct} className="bg-gradient-to-r from-yellow to-orange-400" delay={0.2} />
              </div>
              <p className="mt-1.5 text-sm text-white/80">
                Te faltan <b className="text-white">{level.need - level.into} XP</b> para ser <b className="text-yellow">{level.next}</b> (nivel {level.level + 1})
              </p>
            </div>
          </div>

          <div className="relative mt-5 flex items-center gap-4 rounded-2xl bg-white/10 p-3 backdrop-blur">
            <div className="text-center">
              <p className={`text-4xl ${streak.activeToday && streak.current > 0 ? "animate-pulse" : "grayscale"}`} aria-hidden>
                🔥
              </p>
              <p className="font-display text-xl font-extrabold leading-none">{streak.current}</p>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/70">días</p>
            </div>
            <div className="flex-1">
              <div className="flex justify-between gap-1">
                {week.map((d, i) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition ${
                        d.count > 0 ? "bg-yellow text-ink shadow-[0_0_14px_rgba(246,212,74,0.7)]" : "bg-white/15 text-white/40"
                      } ${i === week.length - 1 ? "ring-2 ring-white/70" : ""}`}
                      title={`${d.date}: ${d.count} respuestas`}
                    >
                      {d.count > 0 ? "✓" : ""}
                    </span>
                    <span className="text-[0.65rem] font-bold text-white/60">{dayLetter(d.date)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-white/70">
                {streak.activeToday ? "¡Hoy ya sumaste! Vuelve mañana para no perder la racha." : streak.current > 0 ? "Responde hoy para mantener tu racha." : "Responde hoy para empezar una racha."} Mejor racha: {streak.best}
              </p>
            </div>
          </div>
        </Card>

        {/* Daily quests */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">Misiones de hoy</h2>
              <p className="text-sm text-ink-soft">Responde {quests[0].goal} preguntas y gana +{DAILY_BONUS_XP} XP extra.</p>
            </div>
            <span className="rounded-full bg-yellow-soft px-2.5 py-1 text-sm font-bold">
              {questsDone}/{quests.length}
            </span>
          </div>
          <Stagger className="mt-4 space-y-3">
            {quests.map((q) => (
              <StaggerItem key={q.id}>
                <div className={`rounded-xl border-2 p-3 transition ${q.done ? "border-green bg-green-soft" : "border-line bg-card"}`}>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-xl">{q.done ? "✅" : q.emoji}</span>
                    <p className="flex-1 font-bold">{q.label}</p>
                    <span className="text-sm font-bold tabular-nums text-ink-soft">
                      {q.value}/{q.goal}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-dark">
                    <AnimatedBar percent={(q.value / q.goal) * 100} className={q.done ? "bg-green" : "bg-blue"} delay={0.1} />
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Card>
      </div>

      {/* Badges */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Logros</h2>
          <p className="text-sm font-bold text-ink-soft">
            {unlocked} de {badges.length} desbloqueados
          </p>
        </div>
        <Stagger className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {badges.map((b) => (
            <StaggerItem key={b.id}>
              <div
                title={b.desc}
                className={`relative h-full overflow-hidden rounded-2xl border-2 p-3 text-center transition hover:-translate-y-1 ${
                  b.unlocked
                    ? "border-yellow bg-gradient-to-b from-yellow-soft to-card shadow-md hover:shadow-lg"
                    : "border-line bg-paper"
                }`}
              >
                <span aria-hidden className={`block text-4xl ${b.unlocked ? "" : "opacity-30 grayscale"}`}>
                  {b.unlocked ? b.emoji : "🔒"}
                </span>
                <p className={`mt-1 text-sm font-extrabold leading-tight ${b.unlocked ? "" : "text-muted"}`}>{b.name}</p>
                <p className="mt-0.5 text-xs leading-snug text-ink-soft">{b.desc}</p>
                {!b.unlocked && (
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-paper-dark">
                      <AnimatedBar percent={(b.value / b.goal) * 100} className="bg-blue" delay={0.1} />
                    </div>
                    <p className="mt-0.5 text-[0.65rem] font-bold tabular-nums text-muted">
                      {b.value}/{b.goal}
                    </p>
                  </div>
                )}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Card>
    </section>
  );
}
