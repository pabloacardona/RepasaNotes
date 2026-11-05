import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { condenseDocument, transcribeNotes, AIGenerationError } from "@/lib/ai";
import { extractFileText, ExtractError } from "@/lib/extract";
import { NOTE_MAX } from "@/lib/validators";

export const maxDuration = 120;

// Reads an uploaded .txt/.md/.pdf/.docx and returns a note draft (not saved).
// Long documents are condensed with AI so they fit the note limit.
export async function POST(req: Request) {
  const { error } = await requireApiUser();
  if (error) return error;

  const form = await req.formData().catch(() => null);
  const photos = (form?.getAll("photos") ?? []).filter((x): x is File => x instanceof File);
  if (photos.length > 0) {
    if (photos.length > 6 || photos.some((p) => !/^image\/(jpeg|png|webp)$/.test(p.type) || p.size > 3_000_000)) {
      return NextResponse.json({ errors: { form: "Usa hasta 6 fotos JPG, PNG o WebP." } }, { status: 400 });
    }
    try {
      const images = await Promise.all(photos.map(async (p) => ({ data: new Uint8Array(await p.arrayBuffer()), mediaType: p.type })));
      const draft = await transcribeNotes(images, "Apuntes de foto");
      return NextResponse.json({ draft, condensed: false, fromPhotos: true });
    } catch (err) {
      if (err instanceof AIGenerationError) return NextResponse.json({ errors: { form: err.message } }, { status: 422 });
      console.error("photo import failed", err);
      return NextResponse.json({ errors: { form: "Error inesperado al leer las fotos" } }, { status: 500 });
    }
  }
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
