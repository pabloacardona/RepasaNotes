"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, FieldMessage, Spinner } from "@/components/ui";
import { NOTE_MAX, NOTE_MIN } from "@/lib/validators";

type NoteOpt = { id: string; title: string; topic: string; content: string };

const COUNTS = [5, 10, 15] as const;
const DIFFICULTIES = [
  { value: "facil", label: "Fácil" },
  { value: "media", label: "Media" },
  { value: "dificil", label: "Difícil" },
] as const;

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
    <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-2">
      <div className="space-y-5">
        <div>
          <label htmlFor="note" className="mb-1.5 block font-bold">Apunte</label>
          <select
            id="note"
            value={noteId}
            onChange={(e) => setNoteId(e.target.value)}
            className="w-full rounded-lg border-2 border-blue bg-card px-3.5 py-2.5 outline-none"
          >
            {notes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.topic} · {n.title}
              </option>
            ))}
          </select>
        </div>

        <Segmented
          label="Número de preguntas"
          options={COUNTS.map((c) => ({ value: String(c), label: String(c) }))}
          value={String(count)}
          onChange={(v) => setCount(Number(v) as (typeof COUNTS)[number])}
        />
        <Segmented
          label="Dificultad"
          options={DIFFICULTIES.map((d) => ({ value: d.value, label: d.label }))}
          value={difficulty}
          onChange={setDifficulty}
        />

        <Button type="submit" variant="ai" disabled={loading || !lengthOk} className="w-full py-3.5 text-lg">
          {loading ? <Spinner /> : <span aria-hidden>💡</span>}
          {loading ? "Generando preguntas…" : "Generar con IA"}
        </Button>
        {loading && (
          <p className="text-center text-sm text-ink-soft" aria-live="polite">
            Esto puede tardar unos segundos.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-red-soft px-3 py-2 font-bold text-red">
            {error}
          </p>
        )}
      </div>

      <Card className="self-start p-6">
        <p className="text-sm font-bold uppercase tracking-widest text-muted">Vista previa</p>
        <p className="mt-3 line-clamp-6 whitespace-pre-line leading-relaxed">{note?.content}</p>
        <hr className="my-4 border-line" />
        <p className="text-muted">
          {len.toLocaleString("es-CO")} / {NOTE_MAX.toLocaleString("es-CO")} caracteres
        </p>
        <FieldMessage
          ok={lengthOk ? "Longitud válida" : undefined}
          error={
            lengthOk
              ? undefined
              : len < NOTE_MIN
                ? `El apunte necesita al menos ${NOTE_MIN} caracteres`
                : `El apunte supera los ${NOTE_MAX} caracteres`
          }
        />
      </Card>
    </form>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 font-bold">{label}</legend>
      <div className="grid grid-cols-3 overflow-hidden rounded-lg border-2 border-line">
        {options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer py-2.5 text-center font-semibold transition has-focus-visible:outline-3 has-focus-visible:outline-blue ${
              value === o.value ? "bg-blue font-bold text-white" : "bg-card hover:bg-blue-soft"
            }`}
          >
            <input
              type="radio"
              name={label}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
