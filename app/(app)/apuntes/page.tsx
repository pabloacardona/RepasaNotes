import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listNotes } from "@/lib/data";
import { getStudyStats } from "@/lib/stats";
import { StudyStatsPanel } from "@/components/study-stats";
import { LinkButton, PageHeader } from "@/components/ui";
import { NotesList } from "./notes-list";

export const metadata: Metadata = { title: "Mis apuntes" };

export default async function NotesPage() {
  const user = await requireUser();
  const [notes, stats] = await Promise.all([listNotes(user.sub), getStudyStats(user.sub)]);

  return (
    <>
      <PageHeader
        title="Mis apuntes"
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/apuntes/nuevo#ia" variant="ai">💡 Crear con IA</LinkButton>
            <LinkButton href="/apuntes/nuevo#archivo" variant="outline">📎 Subir archivo</LinkButton>
            <LinkButton href="/apuntes/nuevo">+ Nuevo apunte</LinkButton>
          </div>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
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
      <div className="lg:sticky lg:top-20">
        <StudyStatsPanel stats={stats} />
      </div>
      </div>
    </>
  );
}
