import { NextResponse } from "next/server";
import { z } from "zod";
import { AIGenerationError, generateHint } from "@/lib/ai";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  question: z.string().min(1).max(2000),
  options: z.array(z.string().min(1).max(600)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().max(2000).default(""),
});

// Public hint for shared quizzes. Variant quizzes are not stored, so the question comes from the client; the limiter caps abuse.
export async function POST(req: Request) {
  if (!rateLimit(`hint:${clientIp(req)}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Demasiadas pistas seguidas. Espera un poco." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pregunta inválida" }, { status: 400 });
  try {
    return NextResponse.json({ hint: await generateHint(parsed.data) });
  } catch (err) {
    const message = err instanceof AIGenerationError ? err.message : "No se pudo generar la pista.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
