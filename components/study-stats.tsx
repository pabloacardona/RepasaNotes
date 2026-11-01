import type { ReactNode } from "react";
import type { StudyStats } from "@/lib/stats";

// Sequential ramp (one hue, light to dark) for questions answered per day.
const HEAT = ["var(--heat-0)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"];
const DAYS = ["L", "", "X", "", "V", "", "D"];

const fmtDay = (key: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("es-CO", { ...opts, timeZone: "UTC" });
const plural = (n: number, one: string, many: string) => `${n.toLocaleString("es-CO")} ${n === 1 ? one : many}`;

// Hover tooltip in plain CSS (works in server components). Hit target is the wrapper.
function Tip({ text, children, className = "", style }: { text: string; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`group relative inline-flex ${className}`} style={style} aria-label={text}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-card px-2 py-1 text-xs font-semibold text-ink shadow-lg group-hover:block"
      >
        {text}
      </span>
    </span>
  );
}

function Kpi({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-bold tabular-nums">{value}</p>
      {note && <p className="text-xs text-ink-soft">{note}</p>}
    </div>
  );
}

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-display font-bold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function StudyStatsPanel({ stats }: { stats: StudyStats }) {
  const { total } = stats;

  if (total.quizzes === 0) {
    return (
      <aside className="rounded-2xl border border-dashed border-line bg-card p-5 text-center">
        <p className="font-display text-lg font-bold">Tu progreso aparecerá aquí</p>
        <p className="mt-1 text-sm text-ink-soft">
          Resuelve tu primer quiz para ver preguntas respondidas, aciertos por tema y tu constancia.
        </p>
      </aside>
    );
  }

  const delta = stats.thisWeek - stats.lastWeek;
  const maxDay = Math.max(1, ...stats.heatmap.map((d) => d.count));
  const maxWeek = Math.max(1, ...stats.weeks.map((w) => w.count));
  const level = (c: number) => (c <= 0 ? -1 : Math.min(4, Math.ceil((c / maxDay) * 5) - 1));
  const columns = Array.from({ length: stats.heatmap.length / 7 }, (_, w) => stats.heatmap.slice(w * 7, w * 7 + 7));

  return (
    <aside className="space-y-3" aria-label="Estadísticas de estudio">
      <h2 className="font-display text-lg font-bold">Tu progreso</h2>

      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Respondidas" value={total.answered.toLocaleString("es-CO")} note={plural(total.quizzes, "quiz", "quizzes")} />
        <Kpi
          label="Precisión"
          value={stats.accuracy === null ? "—" : `${stats.accuracy}%`}
          note={
            <>
              ✓ {total.correct} · ✗ {total.wrong}
            </>
          }
        />
        <Kpi
          label="Racha"
          value={stats.streak.current > 0 ? `🔥 ${stats.streak.current}` : "0"}
          note={
            stats.streak.current > 0 && !stats.streak.activeToday
              ? "Responde hoy para no perderla"
              : `Mejor: ${plural(stats.streak.best, "día", "días")}`
          }
        />
        <Kpi
          label="Esta semana"
          value={stats.thisWeek.toLocaleString("es-CO")}
          note={
            delta === 0 ? "Igual que la anterior" : delta > 0 ? `▲ ${delta} más que la anterior` : `▼ ${-delta} menos que la anterior`
          }
        />
      </div>

      {/* Per topic: answered, correct and wrong */}
      <Section
        title="Por tema"
        aside={
          <span className="flex items-center gap-3 text-xs text-ink-soft">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-green" aria-hidden /> ✓ Aciertos
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-red" aria-hidden /> ✗ Fallos
            </span>
          </span>
        }
      >
        <ul className="space-y-3">
          {stats.topics.map((t) => {
            const pct = t.answered ? Math.round((t.correct / t.answered) * 100) : 0;
            return (
              <li key={t.topic}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-bold">{t.topic}</span>
                  <span className="shrink-0 tabular-nums text-ink-soft">{plural(t.answered, "respondida", "respondidas")}</span>
                </div>
                {/* Stacked bar: segments separated by a 2px surface gap */}
                <div className="mt-1 flex h-3 gap-[2px]" role="img" aria-label={`${t.topic}: ${t.correct} aciertos, ${t.wrong} fallos`}>
                  {t.correct > 0 && (
                    <Tip text={`${t.correct} aciertos`} className="h-full" style={{ flexGrow: t.correct, flexBasis: 0, minWidth: 6 }}>
                      <span className={`block h-full w-full bg-green ${t.wrong ? "rounded-l-[4px]" : "rounded-[4px]"}`} />
                    </Tip>
                  )}
                  {t.wrong > 0 && (
                    <Tip text={`${t.wrong} fallos`} className="h-full" style={{ flexGrow: t.wrong, flexBasis: 0, minWidth: 6 }}>
                      <span className={`block h-full w-full bg-red ${t.correct ? "rounded-r-[4px]" : "rounded-[4px]"}`} />
                    </Tip>
                  )}
                </div>
                <p className="mt-1 text-xs tabular-nums text-ink-soft">
                  ✓ {t.correct} · ✗ {t.wrong} · <span className="font-bold text-ink">{pct}%</span>
                  {t.skipped > 0 && <> · {t.skipped} sin responder</>}
                </p>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Consistency heatmap */}
      <Section
        title="Constancia"
        aside={<span className="text-xs text-ink-soft">{`Activo ${stats.active30} de 30 días`}</span>}
      >
        <div className="flex gap-[3px]">
          <div className="mr-1 grid grid-rows-7 gap-[3px] text-[10px] text-muted" aria-hidden>
            {DAYS.map((d, i) => (
              <span key={i} className="flex items-center">
                {d}
              </span>
            ))}
          </div>
          {columns.map((week, w) => (
            <div key={w} className="grid flex-1 grid-rows-7 gap-[3px]">
              {week.map((day) => {
                if (day.count < 0) return <span key={day.date} className="aspect-square w-full" aria-hidden />;
                const l = level(day.count);
                return (
                  <Tip key={day.date} className="w-full" text={`${fmtDay(day.date, { weekday: "short", day: "numeric", month: "short" })}: ${plural(day.count, "pregunta", "preguntas")}`}>
                    <span
                      className={`block aspect-square w-full rounded-[3px] ${day.date === stats.today ? "ring-1 ring-ink" : ""}`}
                      style={{ background: l < 0 ? "var(--track)" : HEAT[l] }}
                    />
                  </Tip>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-ink-soft">
          <span>{plural(stats.perActiveDay, "pregunta", "preguntas")} por día activo</span>
          <span className="flex items-center gap-1" aria-hidden>
            Menos
            <span className="h-2.5 w-2.5 rounded-[2px] bg-paper-dark" />
            {HEAT.slice(0, 4).map((c) => (
              <span key={c} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} />
            ))}
            Más
          </span>
        </div>
      </Section>

      {/* Questions per week */}
      <Section title="Preguntas por semana">
        <div className="relative flex h-24 items-end justify-between gap-1 border-b border-line">
          {stats.weeks.map((w, i) => {
            const last = i === stats.weeks.length - 1;
            return (
              <Tip key={w.start} text={`Semana del ${fmtDay(w.start)}: ${plural(w.count, "pregunta", "preguntas")}`} className="h-full flex-1 items-end justify-center">
                <span className="flex h-full w-full flex-col items-center justify-end">
                  {last && <span className="mb-0.5 text-xs font-bold tabular-nums">{w.count}</span>}
                  <span
                    className={`block w-full max-w-6 rounded-t-[4px] ${last ? "bg-blue" : "bg-blue/45"}`}
                    style={{ height: `${w.count ? Math.max((w.count / maxWeek) * 78, 4) : 0}%` }}
                  />
                </span>
              </Tip>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted" aria-hidden>
          <span>{fmtDay(stats.weeks[0].start)}</span>
          <span>Esta semana</span>
        </div>
      </Section>

      {/* Table view: every number above, without relying on color or hover */}
      <details className="rounded-2xl border border-line bg-card p-4 text-sm">
        <summary className="cursor-pointer font-bold">Ver como tabla</summary>
        <table className="mt-3 w-full text-left tabular-nums">
          <caption className="sr-only">Preguntas por tema</caption>
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 font-semibold">Tema</th>
              <th className="py-1 text-right font-semibold">Resp.</th>
              <th className="py-1 text-right font-semibold">✓</th>
              <th className="py-1 text-right font-semibold">✗</th>
              <th className="py-1 text-right font-semibold">%</th>
            </tr>
          </thead>
          <tbody>
            {stats.topics.map((t) => (
              <tr key={t.topic} className="border-t border-line">
                <td className="py-1">{t.topic}</td>
                <td className="py-1 text-right">{t.answered}</td>
                <td className="py-1 text-right">{t.correct}</td>
                <td className="py-1 text-right">{t.wrong}</td>
                <td className="py-1 text-right">{t.answered ? Math.round((t.correct / t.answered) * 100) : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="mt-4 w-full text-left tabular-nums">
          <caption className="sr-only">Preguntas por semana</caption>
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 font-semibold">Semana del</th>
              <th className="py-1 text-right font-semibold">Preguntas</th>
            </tr>
          </thead>
          <tbody>
            {stats.weeks.map((w) => (
              <tr key={w.start} className="border-t border-line">
                <td className="py-1">{fmtDay(w.start)}</td>
                <td className="py-1 text-right">{w.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </aside>
  );
}
