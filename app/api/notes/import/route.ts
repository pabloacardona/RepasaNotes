import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { condenseDocument, AIGenerationError } from "@/lib/ai";
import { extractFileText, ExtractError } from "@/lib/extract";
import { NOTE_MAX } from "@/lib/validators";

export const maxDuration = 120;

// Reads an uploaded .txt/.md/.pdf/.docx and returns a note draft (not saved).
// Long documents are condensed with AI so they fit the note limit.
export async function POST(req: Request) {
  const { error } = await requireApiUser();
  if (error) return error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ errors: { form: "Adjunta un archivo" } }, { status: 400 });
  }

  try {
    const { title, text, truncated } = await extractFileText(file);
    if (text.length <= NOTE_MAX) {
      return NextResponse.json({ draft: { title, topic: "", content: text }, condensed: false });
    }
    const draft = await condenseDocument({ text, titleHint: title });
    return NextResponse.json({ draft, condensed: true, originalLength: text.length, truncated });
  } catch (err) {
    if (err instanceof ExtractError || err instanceof AIGenerationError) {
      return NextResponse.json({ errors: { form: err.message } }, { status: 422 });
    }
    console.error("note import failed", err);
    return NextResponse.json({ errors: { form: "Error inesperado al leer el archivo" } }, { status: 500 });
  }
}
