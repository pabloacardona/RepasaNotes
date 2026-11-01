import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listNotes } from "@/lib/data";
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
      <div className="mb-6">
        <p className="hx-kicker">Preparar misión</p>
        <h1 className="hx-title hx-gold-text text-3xl sm:text-4xl">Forja tu quiz</h1>
        <p className="hx-mute mt-1">La IA crea las preguntas solo con el contenido de tu apunte.</p>
      </div>
      {notes.length === 0 ? (
        <div className="hx-panel p-10 text-center">
          <p className="text-5xl" aria-hidden>📜</p>
          <p className="hx-title mt-3 text-2xl">Primero necesitas un apunte</p>
          <p className="hx-mute mt-2">El quiz se forja a partir de tus notas.</p>
          <Link href="/apuntes/nuevo" className="hx-btn hx-btn-gold mt-6">
            Crear apunte
          </Link>
        </div>
      ) : (
        <GenerateForm
          notes={notes.map((n) => ({ id: n.id, title: n.title, topic: n.topic, content: n.content }))}
          initialNoteId={initial?.id}
        />
      )}
    </>
  );
}
