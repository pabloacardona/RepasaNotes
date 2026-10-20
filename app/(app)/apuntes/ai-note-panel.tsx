"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, FieldMessage, Spinner, inputClass } from "@/components/ui";
import { generateNoteSchema } from "@/lib/validators";

export type NoteDraft = { title: string; topic: string; content: string };

const LEVELS = [
  { value: "basico", label: "Básico" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
] as const;

export function AiNotePanel({
  initialTopic = "",
  hasContent,
  onDraft,
}: {
  initialTopic?: string;
  hasContent: boolean;
  onDraft: (draft: NoteDraft) => void;
}) {
  const [topic, setTopic] = useState(initialTopic);
  const [focus, setFocus] = useState("");
  const [level, setLevel] = useState<string>("intermedio");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = generateNoteSchema.safeParse({ topic, focus, level });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }
    if (hasContent && !window.confirm("El apunte actual se reemplazará por el generado. ¿Continuar?")) {
      return;
    }
    setFieldError(undefined);
    setError(null);
    setDone(false);
    setLoading(true);
    const res = await fetch("/api/notes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    }).catch(() => null);
    setLoading(false);
    if (!res) return setError("Sin conexión. Intenta de nuevo.");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errs = data.errors ?? {};
      return setError(errs.form ?? Object.values(errs)[0] ?? "No se pudo generar el apunte");
    }
    onDraft(data.draft);
    setDone(true);
  }

  return (
    <Card className="border-yellow bg-yellow-soft p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-yellow text-lg">
          💡
        </span>
        <div>
          <h2 className="text-lg font-bold">Crear apunte con IA</h2>
          <p className="text-ink-soft">
            Escribe el tema que quieres repasar y la IA redacta un apunte especializado. Luego lo revisas y lo guardas.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ai-topic" className="mb-1.5 block font-bold">Tema</label>
          <input
            id="ai-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className={inputClass(fieldError ? "error" : undefined)}
            placeholder="Ej. Normalización en bases de datos"
            maxLength={80}
          />
          <FieldMessage error={fieldError} />
        </div>
        <div>
          <label htmlFor="ai-focus" className="mb-1.5 block font-bold">
            Enfoque <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="ai-focus"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            className={inputClass()}
            placeholder="Ej. 1FN, 2FN y 3FN con ejemplos"
            maxLength={200}
          />
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 font-bold">Nivel</legend>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border-2 border-line">
            {LEVELS.map((l) => (
              <label
                key={l.value}
                className={`cursor-pointer py-2.5 text-center font-semibold transition has-focus-visible:outline-3 has-focus-visible:outline-blue ${
                  level === l.value ? "bg-blue font-bold text-white" : "bg-card hover:bg-blue-soft"
                }`}
              >
                <input
                  type="radio"
                  name="ai-level"
                  value={l.value}
                  checked={level === l.value}
                  onChange={() => setLevel(l.value)}
                  className="sr-only"
                />
                {l.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="sm:col-span-2">
          <Button type="submit" variant="dark" disabled={loading} className="w-full py-3">
            {loading ? <Spinner /> : <span aria-hidden>💡</span>}
            {loading ? "Redactando apunte…" : "Generar apunte con IA"}
          </Button>
          <div aria-live="polite">
            {loading && (
              <p className="mt-2 text-center text-sm text-ink-soft">Puede tardar entre 10 y 30 segundos.</p>
            )}
            {done && !loading && (
              <p className="mt-2 font-bold text-green">
                ✓ Apunte generado abajo. Revísalo, edítalo si quieres y guárdalo.
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-2 rounded-lg bg-red-soft px-3 py-2 font-bold text-red">
              {error}
            </p>
          )}
        </div>
      </form>
    </Card>
  );
}
