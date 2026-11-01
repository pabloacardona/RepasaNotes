import type { StudyStats } from "@/lib/stats";
import { StreakFlame } from "@/components/game/streak-flame";

// Compact, always-visible stats for the notes page: five tiles, an eight-week sparkline and the best topics.
export function CompactStats({ stats }: { stats: StudyStats }) {
  const { total } = stats;

  if (total.quizzes === 0) {
    return (
      <div className="hx-panel hx-panel-soft flex items-center justify-center gap-3 px-4 py-3 text-center">
        <span aria-hidden className="text-2xl">
          📊
        </span>
        <p className="hx-mute text-sm">Tus estadísticas aparecerán aquí cuando resuelvas tu primer quiz.</p>
      </div>
    );
  }

  const delta = stats.thisWeek - stats.lastWeek;
  const max = Math.max(1, ...stats.weeks.map((w) => w.count));
  const best = stats.topics
    .filter((t) => t.answered > 0)
    .map((t) => ({ topic: t.topic, pct: Math.round((t.correct / t.answered) * 100), n: t.answered }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);

  const tiles: { label: string; value: React.ReactNode; note?: React.ReactNode }[] = [
    { label: "Quizzes", value: total.quizzes },
    { label: "Respondidas", value: total.answered.toLocaleString("es-CO") },
    {
      label: "Precisión",
      value: stats.accuracy === null ? "—" : `${stats.accuracy}%`,
      note: (
        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[var(--track)]">
          <span className="block h-full rounded-full bg-[var(--ok)]" style={{ width: `${stats.accuracy ?? 0}%` }} />
        </span>
      ),
    },
    {
      label: "Racha",
      value: (
        <span className="inline-flex items-center gap-1">
          <StreakFlame size={20} active={stats.streak.activeToday || stats.streak.current > 0} days={stats.streak.current} />
          {stats.streak.current}
        </span>
      ),
      note: <span className="hx-mute block text-[0.65rem]">mejor {stats.streak.best}</span>,
    },
    {
      label: "Esta semana",
      value: stats.thisWeek,
      note: (
        <span className={`block text-[0.65rem] font-bold ${delta > 0 ? "text-[var(--ok)]" : delta < 0 ? "text-[var(--bad)]" : "hx-mute"}`}>
          {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "= igual"} vs. anterior
        </span>
      ),
    },
  ];

  return (
    <section aria-label="Estadísticas de estudio" className="hx-panel p-3 sm:p-4">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/70 px-3 py-2 text-center transition-colors hover:border-[var(--neon)]">
            <dd className="font-display text-xl font-bold leading-tight tabular-nums">{t.value}</dd>
            <dt className="hx-mute text-[0.65rem] font-bold uppercase tracking-widest">{t.label}</dt>
            {t.note}
          </div>
        ))}
      </dl>

      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
        <div>
          <p className="hx-kicker mb-1">Últimas 8 semanas</p>
          <div className="flex h-10 items-end gap-1" role="img" aria-label="Preguntas por semana">
            {stats.weeks.map((w, i) => (
              <span
                key={w.start}
                title={`Semana del ${w.start}: ${w.count}`}
                className={`w-4 rounded-sm transition-all duration-500 ${i === stats.weeks.length - 1 ? "bg-[var(--b1)] shadow-[0_0_10px_var(--b1)]" : "bg-[var(--b2)]/70"}`}
                style={{ height: w.count === 0 ? 3 : Math.max(6, Math.round((w.count / max) * 40)) }}
              />
            ))}
          </div>
        </div>
        {best.length > 0 && (
          <div>
            <p className="hx-kicker mb-1">Tus temas</p>
            <ul className="flex flex-wrap gap-2">
              {best.map((t) => (
                <li key={t.topic} className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)]/70 py-1 pl-3 pr-1 text-sm">
                  <span className="max-w-[9rem] truncate font-semibold">{t.topic}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.pct >= 70 ? "bg-[var(--ok)]/20 text-[var(--ok)]" : t.pct >= 50 ? "bg-[var(--hi)]/20 text-[var(--hi)]" : "bg-[var(--bad)]/20 text-[var(--bad)]"}`}>{t.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
