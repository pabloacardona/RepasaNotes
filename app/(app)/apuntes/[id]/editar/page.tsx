import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getNote, listNotes } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { NoteForm } from "../../note-form";

export const metadata: Metadata = { title: "Editar apunte" };

export default async function EditNotePage({ params }: PageProps<"/apuntes/[id]/editar">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireUser();
  const [note, all] = await Promise.all([getNote(user.sub, id), listNotes(user.sub)]);
  if (!note) notFound();

  return (
    <>
      <PageHeader title="Editar apunte" kicker="Mis apuntes" />
      <NoteForm
        note={{ id: note.id, title: note.title, topic: note.topic, content: note.content }}
        topics={[...new Set(all.map((n) => n.topic))]}
      />
    </>
  );
}
