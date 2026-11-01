"use client";

import { useRef, useState, type DragEvent } from "react";
import { Spinner } from "@/components/ui";
import type { NoteDraft } from "./ai-note-panel";

const ACCEPT = ".txt,.md,.pdf,.docx";
const MAX_BYTES = 4 * 1024 * 1024;

export function FileImportPanel({
  hasContent,
  onDraft,
}: {
  hasContent: boolean;
  onDraft: (draft: NoteDraft) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setNotice(null);
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPT.split(",").includes(ext)) {
      return setError("Formato no compatible. Usa .txt, .md, .pdf o .docx.");
    }
    if (file.size > MAX_BYTES) return setError("El archivo supera los 4 MB.");
    if (hasContent && !window.confirm("El apunte actual se reemplazará por el del archivo. ¿Continuar?")) {
      return;
    }

    setLoading(file.name);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/notes/import", { method: "POST", body }).catch(() => null);
    setLoading(null);
    if (!res) return setError("Sin conexión. Intenta de nuevo.");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.errors?.form ?? "No se pudo leer el archivo");

    onDraft(data.draft);
    setNotice(
      data.condensed
        ? `✓ El documento era largo (${Number(data.originalLength).toLocaleString("es-CO")} caracteres), así que la IA lo resumió en un apunte.${data.truncated ? " Solo se usó la primera parte." : ""} Revísalo y guárdalo.`
        : "✓ Texto cargado abajo. Completa el tema, revisa y guarda.",
    );
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && !loading) upload(file);
  }

  return (
    <div className="hx-panel p-5 sm:p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
          dragging ? "scale-[1.01] border-[var(--neon)] bg-[var(--neon)]/10 shadow-[0_0_30px_color-mix(in_oklab,var(--neon)_30%,transparent)]" : "border-[var(--line-strong)] bg-[var(--surface-2)]/60"
        }`}
      >
        {loading ? (
          <>
            <Spinner />
            <p className="font-bold">Leyendo {loading}…</p>
            <p className="text-sm text-ink-soft">Si es largo, la IA lo resumirá. Puede tardar hasta un minuto.</p>
          </>
        ) : (
          <>
            <span aria-hidden className="text-4xl">📎</span>
            <p className="font-display text-lg font-bold">Arrastra aquí tu archivo</p>
            <p className="text-sm text-ink-soft">PDF, Word (.docx), .txt o .md · máximo 4 MB</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="hx-btn hx-btn-gold"
            >
              Elegir archivo
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label="Subir archivo de apuntes"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) upload(f);
          }}
        />
      </div>
      <div aria-live="polite">
        {notice && <p className="mt-3 font-bold text-green">{notice}</p>}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-soft px-3 py-2 font-bold text-red">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
