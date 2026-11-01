import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listNotes } from "@/lib/data";
import { getStudyStats } from "@/lib/stats";
import { StudyStatsPanel } from "@/components/study-stats";
import { Reveal } from "@/components/motion/reveal";
import { NotesList } from "./notes-list";

export const metadata: Metadata = { title: "Mis apuntes" };

export default async function NotesPage() {
  const user = await requireUser();
  const [notes, stats] = await Promise.all([listNotes(user.sub), getStudyStats(user.sub)]);
  const topics = new Set(notes.map((n) => n.topic)).size;

  return (
    <>
      <Reveal>
        <header className="text-center">
          <p className="hx-kicker justify-center">Tu biblioteca</p>
          <h1 className="mt-1 font-display text-4xl font-bold sm:text-5xl">Mis apuntes</h1>
          <p className="hx-mute mx-auto mt-2 max-w-md">
            {notes.length === 0
              ? "Aquí vive todo lo que estudias. Empieza con tu primer apunte."
              : `${notes.length} ${notes.length === 1 ? "apunte" : "apuntes"} en ${topics} ${topics === 1 ? "tema" : "temas"}. Elige uno y conviértelo en un quiz.`}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/apuntes/nuevo#ia" className="hx-btn hx-btn-gold">
              💡 Crear con IA
            </Link>
            <Link href="/apuntes/nuevo#archivo" className="hx-btn">
              📎 Subir archivo
            </Link>
            <Link href="/apuntes/nuevo" className="hx-btn">
              + Escribir
            </Link>
          </div>
        </header>
      </Reveal>

      <div className="mt-8">
        <NotesList
          notes={notes.map((n) => ({
            id: n.id,
            title: n.title,
            topic: n.topic,
            updatedAt: n.updatedAt.toISOString(),
            preview: n.content.slice(0, 160),
            stats: stats.byNote[n.id] ?? null,
          }))}
        />
      </div>

      {notes.length > 0 && (
        <details className="group mt-10">
          <summary className="mx-auto flex w-fit cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-5 py-2 font-bold transition hover:border-[var(--neon)]">
            📊 Estadísticas de estudio
            <span aria-hidden className="text-xs transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <div className="mt-4">
            <StudyStatsPanel stats={stats} />
          </div>
        </details>
      )}
    </>
  );
}
