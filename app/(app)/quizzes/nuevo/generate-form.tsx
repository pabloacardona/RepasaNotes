"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Spinner } from "@/components/ui";
import { scoreRun } from "@/lib/score";
import { xpForQuiz } from "@/lib/gamification";
import { NOTE_MAX, NOTE_MIN } from "@/lib/validators";

type NoteOpt = { id: string; title: string; topic: string; content: string };

const COUNTS = [5, 10, 15] as const;
const DIFFICULTIES = [
  { value: "facil", label: "Fácil", icon: "🌿", color: "#7fc4a4", blurb: "Conceptos base y definiciones." },
  { value: "media", label: "Media", icon: "⚔️", color: "#e7c88a", blurb: "Aplicar lo que sabes." },
  { value: "dificil", label: "Difícil", icon: "🐉", color: "#e0788c", blurb: "Casos y detalles finos. Jefe final." },
] as const;

// Most XP a quiz can give: every question right in a row.
const maxXp = (n: number) => xpForQuiz(scoreRun(Array(n).fill(0), Array(n).fill(0)).points, n, n);

export function GenerateForm({ notes, initialNoteId }: { notes: NoteOpt[]; initialNoteId?: string }) {
  const router = useRouter();
  const [noteId, setNoteId] = useState(initialNoteId ?? notes[0]?.id);
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const [difficulty, setDifficulty] = useState<string>("media");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const note = notes.find((n) => n.id === noteId);
  const len = note?.content.trim().length ?? 0;
  const lengthOk = len >= NOTE_MIN && len <= NOTE_MAX;
  const lengthPct = Math.min(100, Math.round((len / NOTE_MAX) * 100));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!note || !lengthOk) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId, count, difficulty }),
    }).catch(() => null);
    if (!res) {
      setLoading(false);
      return setError("Sin conexión. Intenta de nuevo.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      const errs = data.errors ?? {};
      return setError(errs.form ?? Object.values(errs)[0] ?? data.error ?? "No se pudo generar el quiz");
    }
    router.push(`/quiz/${data.quiz.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        {/* Step 1: note */}
        <section className="hx-panel p-5">
          <p className="hx-kicker">1 · Elige tu apunte</p>
          <select
            id="note"
            value={noteId}
            onChange={(e) => setNoteId(e.target.value)}
            aria-label="Apunte"
            className="mt-3 w-full border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-3 font-bold text-[var(--fg)] outline-none focus:border-[var(--neon)]"
          >
            {notes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.topic} · {n.title}
              </option>
            ))}
          </select>
        </section>

        {/* Step 2: difficulty */}
        <section className="hx-panel p-5">
          <p className="hx-kicker">2 · Elige la dificultad</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Dificultad">
            {DIFFICULTIES.map((d) => {
              const on = difficulty === d.value;
              return (
                <label
                  key={d.value}
                  className="relative cursor-pointer p-3 text-center transition has-focus-visible:outline-2 has-focus-visible:outline-[var(--neon)]"
                  style={{
                    border: `1.5px solid ${on ? d.color : "var(--line-strong)"}`,
                    background: on ? `${d.color}1f` : "color-mix(in oklab, var(--fg) 4%, transparent)",
                    boxShadow: on ? `0 0 22px ${d.color}55, inset 0 0 18px ${d.color}22` : "none",
                    transform: on ? "translateY(-3px)" : "none",
                  }}
                >
                  <input type="radio" name="difficulty" value={d.value} checked={on} onChange={() => setDifficulty(d.value)} className="sr-only" />
                  <span className="block text-3xl" aria-hidden>
                    {d.icon}
                  </span>
                  <span className="mt-1 block font-display font-bold uppercase tracking-wider" style={{ color: on ? d.color : "#d2c7c4" }}>
                    {d.label}
                  </span>
                  <span className="hx-mute mt-0.5 block text-xs">{d.blurb}</span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Step 3: length */}
        <section className="hx-panel p-5">
          <p className="hx-kicker">3 · Número de preguntas</p>
          <div className="mt-3 grid grid-cols-3 gap-3" role="radiogroup" aria-label="Número de preguntas">
            {COUNTS.map((c) => {
              const on = count === c;
              return (
                <label
                  key={c}
                  className="cursor-pointer py-3 text-center transition has-focus-visible:outline-2 has-focus-visible:outline-[var(--neon)]"
                  style={{
                    border: `1.5px solid ${on ? "var(--accent)" : "var(--line-strong)"}`,
                    background: on ? "color-mix(in oklab, var(--accent) 22%, transparent)" : "color-mix(in oklab, var(--fg) 4%, transparent)",
                    boxShadow: on ? "0 0 18px color-mix(in oklab, var(--accent) 40%, transparent)" : "none",
                  }}
                >
                  <input type="radio" name="count" value={c} checked={on} onChange={() => setCount(c)} className="sr-only" />
                  <span className={`hx-title block text-2xl ${on ? "hx-gold-text" : ""}`}>{c}</span>
                  <span className="hx-mute block text-[0.65rem] font-bold uppercase tracking-wider">hasta {maxXp(c)} XP</span>
                </label>
              );
            })}
          </div>
        </section>

        <div>
          <button type="submit" disabled={loading || !lengthOk} className="hx-btn hx-btn-gold hx-shine w-full !py-4 text-lg">
            {loading ? <Spinner /> : <span aria-hidden>⚔️</span>}
            {loading ? "Forjando preguntas…" : "Comenzar misión"}
          </button>
          {loading && (
            <p className="hx-mute mt-2 text-center text-sm" aria-live="polite">
              La IA está preparando tu misión. Puede tardar unos segundos.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 border-l-2 border-[var(--bad)] bg-[var(--bad)]/10 px-3 py-2 font-bold text-[var(--bad-soft)]">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Preview */}
      <aside className="hx-panel hx-panel-soft self-start p-5">
        <p className="hx-kicker">Pergamino</p>
        <p className="hx-title mt-1 text-xl">{note?.title}</p>
        <p className="hx-mute text-sm">{note?.topic}</p>
        <p className="mt-3 line-clamp-8 whitespace-pre-line leading-relaxed text-[var(--fg2)]">{note?.content}</p>
        <div className="hx-rule my-4">
          <span />
        </div>
        <div className={`hx-bar ${lengthOk ? "" : "hx-bar-red"}`}>
          <span style={{ width: `${Math.max(lengthPct, 2)}%` }} />
        </div>
        <p className="hx-mute mt-1.5 text-sm">
          {len.toLocaleString("es-CO")} / {NOTE_MAX.toLocaleString("es-CO")} caracteres
        </p>
        <p className={`mt-1 text-sm font-bold ${lengthOk ? "text-[var(--ok)]" : "text-[var(--bad-soft)]"}`} role={lengthOk ? undefined : "alert"}>
          {lengthOk
            ? "✓ Longitud válida"
            : len < NOTE_MIN
              ? `⚠ El apunte necesita al menos ${NOTE_MIN} caracteres`
              : `⚠ El apunte supera los ${NOTE_MAX} caracteres`}
        </p>
      </aside>
    </form>
  );
}
