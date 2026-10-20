import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listNotes } from "@/lib/data";
import { LinkButton, PageHeader } from "@/components/ui";
import { NotesList } from "./notes-list";

export const metadata: Metadata = { title: "Mis apuntes" };

export default async function NotesPage() {
  const user = await requireUser();
  const notes = await listNotes(user.sub);

  return (
    <>
      <PageHeader title="Mis apuntes" action={<LinkButton href="/apuntes/nuevo">+ Nuevo apunte</LinkButton>} />
      <NotesList
        notes={notes.map((n) => ({
          id: n.id,
          title: n.title,
          topic: n.topic,
          updatedAt: n.updatedAt.toISOString(),
          preview: n.content.slice(0, 160),
        }))}
      />
    </>
  );
}
