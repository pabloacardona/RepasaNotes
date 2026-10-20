import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listNotes } from "@/lib/data";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { GenerateForm } from "./generate-form";

export const metadata: Metadata = { title: "Nuevo quiz" };

export default async function NewQuizPage({ searchParams }: PageProps<"/quizzes/nuevo">) {
  const user = await requireUser();
  const { apunte, tema } = await searchParams;
  const notes = await listNotes(user.sub);

  const initial =
    notes.find((n) => n.id === apunte) ?? notes.find((n) => n.topic === tema) ?? notes[0];

  return (
    <>
      <PageHeader title="Nuevo quiz" />
      <p className="-mt-4 mb-6 text-ink-soft">La IA crea las preguntas solo con el contenido de tu apunte.</p>
      {notes.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-display text-xl font-bold">Primero necesitas un apunte</p>
          <p className="mt-2 text-ink-soft">El quiz se genera a partir de tus notas.</p>
          <LinkButton href="/apuntes/nuevo" className="mt-6">Crear apunte</LinkButton>
        </Card>
      ) : (
        <GenerateForm
          notes={notes.map((n) => ({ id: n.id, title: n.title, topic: n.topic, content: n.content }))}
          initialNoteId={initial?.id}
        />
      )}
    </>
  );
}
