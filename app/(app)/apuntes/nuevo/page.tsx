import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listNotes } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { NoteForm } from "../note-form";

export const metadata: Metadata = { title: "Nuevo apunte" };

export default async function NewNotePage() {
  const user = await requireUser();
  const topics = [...new Set((await listNotes(user.sub)).map((n) => n.topic))];
  return (
    <>
      <PageHeader title="Nuevo apunte" kicker="Mis apuntes" />
      <NoteForm topics={topics} />
    </>
  );
}
