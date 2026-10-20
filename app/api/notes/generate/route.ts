import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { generateNote, AIGenerationError } from "@/lib/ai";
import { generateNoteSchema, fieldErrors } from "@/lib/validators";

export const maxDuration = 90;

// Returns a draft note (not saved). The user reviews it and saves via POST /api/notes.
export async function POST(req: Request) {
  const { error } = await requireApiUser();
  if (error) return error;

  const parsed = generateNoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const draft = await generateNote(parsed.data);
    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return NextResponse.json({ errors: { form: err.message } }, { status: 502 });
    }
    console.error("note generation failed", err);
    return NextResponse.json(
      { errors: { form: "Error inesperado al generar el apunte" } },
      { status: 500 },
    );
  }
}
