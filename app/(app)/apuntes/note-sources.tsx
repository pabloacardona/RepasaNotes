"use client";

import { useEffect, useState } from "react";
import { AiNotePanel, type NoteDraft } from "./ai-note-panel";
import { FileImportPanel } from "./file-import-panel";

type Tab = "ia" | "archivo";

const TABS: { id: Tab; label: string }[] = [
  { id: "ia", label: "💡 Crear con IA" },
  { id: "archivo", label: "📎 Subir archivo" },
];

export function NoteSources(props: {
  initialTopic?: string;
  hasContent: boolean;
  onDraft: (draft: NoteDraft) => void;
}) {
  const [tab, setTab] = useState<Tab>("ia");

  // Allow deep links like /apuntes/nuevo#archivo.
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.slice(1);
      if (h === "ia" || h === "archivo") setTab(h);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <section id="fuentes" className="mb-5 scroll-mt-24">
      <div role="tablist" aria-label="Cómo crear el apunte" className="mb-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full border-2 px-4 py-2 font-bold transition ${
              tab === t.id ? "border-ink bg-ink text-yellow" : "border-line bg-card hover:border-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="self-center text-sm text-muted">o escríbelo tú abajo</span>
      </div>
      <div role="tabpanel">
        {tab === "ia" ? (
          <AiNotePanel {...props} />
        ) : (
          <FileImportPanel hasContent={props.hasContent} onDraft={props.onDraft} />
        )}
      </div>
    </section>
  );
}
