import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listNotes } from "@/lib/data";
import { NoteForm } from "../note-form";

export const metadata: Metadata = { title: "Nuevo apunte" };

export default async function NewNotePage({ searchParams }: PageProps<"/apuntes/nuevo">) {
  const user = await requireUser();
  const { tema } = await searchParams;
  const topics = [...new Set((await listNotes(user.sub)).map((n) => n.topic))];
  return (
    <>
      <header className="mb-6 text-center">
        <p className="hx-kicker justify-center">Mis apuntes</p>
        <h1 className="mt-1 font-display text-4xl font-bold">Nuevo apunte</h1>
        <p className="hx-mute mx-auto mt-2 max-w-md">Escríbelo, súbelo o pídele a la IA que lo redacte.</p>
      </header>
      <NoteForm topics={topics} initialTopic={typeof tema === "string" ? tema.slice(0, 80) : ""} />
    </>
  );
}
