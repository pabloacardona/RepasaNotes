"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, FieldMessage, LinkButton, Spinner, inputClass } from "@/components/ui";
import { NOTE_MAX, NOTE_MIN, noteSchema } from "@/lib/validators";

type Values = { title: string; topic: string; content: string };

export function NoteForm({
  note,
  topics,
}: {
  note?: Values & { id: string };
  topics: string[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({
    title: note?.title ?? "",
    topic: note?.topic ?? "",
    content: note?.content ?? "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const result = noteSchema.safeParse(values);
  const errors: Record<string, string> = {};
  if (!result.success) {
    for (const i of result.error.issues) {
      const k = String(i.path[0]);
      if (!errors[k]) errors[k] = i.message;
    }
  }
  const err = (k: keyof Values) => serverErrors[k] ?? (submitted ? errors[k] : undefined);

  const len = values.content.trim().length;
  const lengthOk = len >= NOTE_MIN && len <= NOTE_MAX;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!result.success) return;
    setSaving(true);
    setServerErrors({});
    const res = await fetch(note ? `/api/notes/${note.id}` : "/api/notes", {
      method: note ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).catch(() => null);
    setSaving(false);
    if (!res) return setServerErrors({ form: "Sin conexión. Intenta de nuevo." });
    const data = await res.json();
    if (!res.ok) return setServerErrors(data.errors ?? { form: data.error ?? "No se pudo guardar" });
    router.push("/apuntes");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <Card className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="title" className="mb-1.5 block font-bold">Título</label>
            <input
              id="title"
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              className={inputClass(err("title") ? "error" : undefined)}
              placeholder="Rutas y controladores"
              maxLength={120}
            />
            <FieldMessage error={err("title")} />
          </div>
          <div>
            <label htmlFor="topic" className="mb-1.5 block font-bold">Tema</label>
            <input
              id="topic"
              list="topics"
              value={values.topic}
              onChange={(e) => setValues((v) => ({ ...v, topic: e.target.value }))}
              className={inputClass(err("topic") ? "error" : undefined)}
              placeholder="Node.js"
              maxLength={60}
            />
            <datalist id="topics">
              {topics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <FieldMessage error={err("topic")} />
          </div>
        </div>
        <div>
          <label htmlFor="content" className="mb-1.5 block font-bold">Contenido del apunte</label>
          <textarea
            id="content"
            value={values.content}
            onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
            rows={14}
            className={`${inputClass(err("content") ? "error" : undefined)} resize-y leading-relaxed`}
            placeholder="Pega aquí tus notas de clase…"
          />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
            <FieldMessage
              error={err("content")}
              ok={!err("content") && lengthOk ? "Longitud válida" : undefined}
            />
            <span className={`ml-auto ${len > NOTE_MAX ? "font-bold text-red" : "text-muted"}`}>
              {len.toLocaleString("es-CO")} / {NOTE_MAX.toLocaleString("es-CO")} caracteres
            </span>
          </div>
        </div>
      </Card>

      {serverErrors.form && (
        <p role="alert" className="rounded-lg bg-red-soft px-3 py-2 font-bold text-red">
          {serverErrors.form}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <LinkButton href="/apuntes" variant="outline">Cancelar</LinkButton>
        <Button type="submit" disabled={saving}>
          {saving && <Spinner />}
          {note ? "Guardar cambios" : "Guardar apunte"}
        </Button>
      </div>
    </form>
  );
}
