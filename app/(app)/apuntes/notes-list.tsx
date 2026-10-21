"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card, LinkButton, formatDate } from "@/components/ui";

type NoteStats = { answered: number; correct: number; wrong: number; quizzes: number };
type NoteItem = { id: string; title: string; topic: string; updatedAt: string; preview: string; stats: NoteStats | null };

// Small per-note summary: answered, correct, wrong and accuracy.
function NoteProgress({ stats }: { stats: NoteStats | null }) {
  if (!stats || stats.answered === 0) {
    return <p className="mt-1 text-xs text-muted">Sin preguntas respondidas todavía</p>;
  }
  const pct = Math.round((stats.correct / stats.answered) * 100);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-ink-soft">
      <span>
        <span className="font-bold text-ink">{stats.answered}</span> respondidas
      </span>
      <span>✓ {stats.correct}</span>
      <span>✗ {stats.wrong}</span>
      <span className="flex items-center gap-1.5" aria-label={`Precisión ${pct}%`}>
        <span className="flex h-1.5 w-16 gap-[2px]" aria-hidden>
          <span className="h-full rounded-l-full bg-green" style={{ flexGrow: stats.correct, flexBasis: 0 }} />
          <span className="h-full rounded-r-full bg-red" style={{ flexGrow: stats.wrong, flexBasis: 0 }} />
        </span>
        <span className="font-bold text-ink">{pct}%</span>
      </span>
    </div>
  );
}

export function NotesList({ notes }: { notes: NoteItem[] }) {
  const router = useRouter();
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
      <Card className="p-10 text-center">
        <p className="font-display text-xl font-bold">Aún no tienes apuntes</p>
        <p className="mt-2 text-ink-soft">
          Sube un PDF o Word, pega tus notas o deja que la IA las escriba por ti.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LinkButton href="/apuntes/nuevo#ia" variant="ai">
            💡 Crear con IA
          </LinkButton>
          <LinkButton href="/apuntes/nuevo#archivo" variant="outline">
            📎 Subir archivo
          </LinkButton>
          <LinkButton href="/apuntes/nuevo">Escribir apunte</LinkButton>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tema">
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              aria-pressed={topic === t}
              className={`rounded-full border-2 px-4 py-1.5 font-semibold transition ${
                topic === t ? "border-ink bg-ink text-yellow" : "border-line bg-card hover:border-ink-soft"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Buscar apunte</span>
          <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar apunte"
            className="w-full rounded-lg border-2 border-line bg-card py-2 pl-9 pr-3 outline-none focus:border-blue"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-soft px-3 py-2 font-bold text-red">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-ink-soft">No hay apuntes que coincidan.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((n) => (
            <li key={n.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <Link href={`/apuntes/${n.id}/editar`} className="font-display text-lg font-bold hover:underline">
                    {n.title}
                  </Link>
                  <p className="text-ink-soft">
                    {n.topic} · {formatDate(n.updatedAt)}
                  </p>
                  <NoteProgress stats={n.stats} />
                </div>
                {confirmId === n.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">¿Eliminar este apunte?</span>
                    <button
                      onClick={() => remove(n.id)}
                      disabled={deleting}
                      className="rounded-lg bg-red px-3 py-1.5 font-bold text-white disabled:opacity-60"
                    >
                      {deleting ? "Eliminando…" : "Sí, eliminar"}
                    </button>
                    <button onClick={() => setConfirmId(null)} className="rounded-lg px-3 py-1.5 font-bold">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <LinkButton variant="ai" href={`/quizzes/nuevo?apunte=${n.id}`} className="py-2">
                      Generar quiz
                    </LinkButton>
                    <LinkButton variant="ghost" href={`/apuntes/${n.id}/editar`} className="py-2">
                      Editar
                    </LinkButton>
                    <button
                      onClick={() => setConfirmId(n.id)}
                      className="rounded-lg px-4 py-2 font-bold text-red transition hover:bg-red-soft"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
