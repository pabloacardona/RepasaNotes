"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatDate } from "@/components/ui";

type NoteStats = { answered: number; correct: number; wrong: number; quizzes: number };
type NoteItem = { id: string; title: string; topic: string; updatedAt: string; preview: string; stats: NoteStats | null };

// Each topic gets a stable colour so the library reads at a glance.
const HUES = [265, 190, 330, 45, 150, 15, 215];
function hue(topic: string) {
  let h = 0;
  for (const ch of topic) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

function NoteProgress({ stats }: { stats: NoteStats | null }) {
  if (!stats || stats.answered === 0) {
    return <p className="hx-mute text-xs">Sin preguntas respondidas todavía</p>;
  }
  const pct = Math.round((stats.correct / stats.answered) * 100);
  return (
    <div className="space-y-1" aria-label={`Precisión ${pct}%`}>
      <div className="flex items-center justify-between text-xs">
        <span className="hx-mute">
          <b className="text-[var(--fg)]">{stats.answered}</b> respondidas · ✓ {stats.correct} · ✗ {stats.wrong}
        </span>
        <b className={pct >= 70 ? "text-[var(--ok)]" : pct >= 50 ? "text-[var(--hi)]" : "text-[var(--bad)]"}>{pct}%</b>
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        <span className="rounded-l-full bg-[var(--ok)]" style={{ flexGrow: stats.correct, flexBasis: 0 }} />
        <span className="rounded-r-full bg-[var(--bad)]" style={{ flexGrow: stats.wrong, flexBasis: 0 }} />
      </div>
    </div>
  );
}

export function NotesList({ notes }: { notes: NoteItem[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [topic, setTopic] = useState<string>("Todos");
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topics = useMemo(() => ["Todos", ...new Set(notes.map((n) => n.topic))], [notes]);
  const filtered = notes.filter(
    (n) =>
      (topic === "Todos" || n.topic === topic) &&
      (n.title + " " + n.topic + " " + n.preview).toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function remove(id: string) {
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setDeleting(false);
    setConfirmId(null);
    if (!res.ok) {
      setError("No se pudo eliminar el apunte.");
      return;
    }
    router.refresh();
  }

  if (notes.length === 0) {
    return (
      <div className="hx-epic-soft hx-epic mx-auto max-w-xl px-6 py-12 text-center">
        <p className="text-6xl" aria-hidden>
          📜
        </p>
        <p className="mt-3 font-display text-2xl font-bold">Tu biblioteca está vacía</p>
        <p className="hx-mute mt-2">Sube un PDF o Word, pega tus notas o deja que la IA las escriba por ti.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/apuntes/nuevo#ia" className="hx-btn hx-btn-gold">
            💡 Crear con IA
          </Link>
          <Link href="/apuntes/nuevo#archivo" className="hx-btn">
            📎 Subir archivo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-col items-center gap-3">
        <label className="relative w-full max-w-md">
          <span className="sr-only">Buscar apunte</span>
          <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[var(--mute)]">
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en tus apuntes"
            className="w-full rounded-full border border-[var(--line-strong)] bg-[var(--surface)] py-2.5 pl-11 pr-4 outline-none transition focus:border-[var(--neon)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--neon)_25%,transparent)]"
          />
        </label>
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Filtrar por tema">
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              aria-pressed={topic === t}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                topic === t ? "border-transparent bg-gradient-to-r from-[var(--b1)] to-[var(--b2)] text-white shadow-[0_0_18px_color-mix(in_oklab,var(--b1)_55%,transparent)]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--neon)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mx-auto mb-3 max-w-md rounded-lg bg-red-soft px-3 py-2 text-center font-bold text-red">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="hx-mute py-10 text-center">No hay apuntes que coincidan.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {filtered.map((n, i) => {
              const h = hue(n.topic);
              const confirming = confirmId === n.id;
              return (
                <motion.li
                  key={n.id}
                  layout={reduce ? false : "position"}
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26, delay: Math.min(i * 0.04, 0.3) }}
                >
                  <div className="hx-panel hx-lift flex h-full flex-col gap-3 p-4" style={{ ["--tc" as string]: `hsl(${h} 90% 62%)` }}>
                    <div className="flex items-start gap-3">
                      <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl" style={{ background: `hsl(${h} 90% 62% / 0.18)`, border: `1px solid hsl(${h} 90% 62% / 0.5)` }}>
                        📜
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/apuntes/${n.id}/editar`} className="block truncate font-display text-lg font-bold leading-tight hover:underline">
                          {n.title}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: `hsl(${h} 90% 62% / 0.16)`, color: `hsl(${h} 90% 70%)` }}>
                            {n.topic}
                          </span>
                          <span className="hx-mute">{formatDate(n.updatedAt)}</span>
                        </p>
                      </div>
                    </div>
                    <p className="hx-mute line-clamp-2 text-sm leading-snug">{n.preview}</p>
                    <NoteProgress stats={n.stats} />

                    <div className="mt-auto flex items-center gap-2 pt-1">
                      {confirming ? (
                        <>
                          <span className="flex-1 text-sm font-semibold">¿Eliminar?</span>
                          <button onClick={() => remove(n.id)} disabled={deleting} className="hx-btn hx-btn-danger !px-3 !py-1.5 text-sm">
                            {deleting ? "Eliminando…" : "Sí"}
                          </button>
                          <button onClick={() => setConfirmId(null)} className="hx-btn !px-3 !py-1.5 text-sm">
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <Link href={`/quizzes/nuevo?apunte=${n.id}`} className="hx-btn hx-btn-gold flex-1 !py-1.5 text-sm">
                            ⚔️ Generar quiz
                          </Link>
                          <Link href={`/apuntes/${n.id}/editar`} className="hx-btn !px-3 !py-1.5 text-sm" aria-label="Editar apunte" title="Editar">
                            ✎
                          </Link>
                          <button onClick={() => setConfirmId(n.id)} className="hx-btn !px-3 !py-1.5 text-sm hover:!border-[var(--bad)] hover:!text-[var(--bad)]" aria-label="Eliminar apunte" title="Eliminar">
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </>
  );
}
