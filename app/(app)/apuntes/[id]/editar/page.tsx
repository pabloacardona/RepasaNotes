import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getNote, listNotes } from "@/lib/data";
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
      <header className="mb-6 text-center">
        <p className="hx-kicker justify-center">Mis apuntes</p>
        <h1 className="mt-1 font-display text-4xl font-bold">Editar apunte</h1>
        <p className="hx-mute mx-auto mt-2 max-w-md">Ajusta el contenido y guarda. El próximo quiz usará la versión nueva.</p>
      </header>
      <NoteForm
        note={{ id: note.id, title: note.title, topic: note.topic, content: note.content }}
        topics={[...new Set(all.map((n) => n.topic))]}
      />
    </>
  );
}
