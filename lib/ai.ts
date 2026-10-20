import "server-only";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import type { Question } from "./db/schema";

// Open-weights models served through Vercel AI Gateway.
// Auth: VERCEL_OIDC_TOKEN on Vercel / after `vercel env pull`, or AI_GATEWAY_API_KEY.
const MODEL = process.env.AI_GATEWAY_MODEL ?? "openai/gpt-oss-120b";
const FALLBACK_MODELS = ["deepseek/deepseek-v4-flash"];

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe("Enunciado de la pregunta"),
      options: z.array(z.string()).describe("Exactamente 4 opciones, sin prefijos"),
      correctIndex: z.number().int().describe("Índice 0-3 de la opción correcta"),
      explanation: z.string().describe("Por qué la respuesta correcta es la correcta"),
    }),
  ),
});

const DIFFICULTY_PROMPT: Record<string, string> = {
  facil: "fácil: preguntas directas sobre definiciones e ideas principales",
  media: "media: preguntas que exigen entender y relacionar conceptos",
  dificil: "difícil: preguntas de aplicación y análisis, con distractores plausibles",
};

const SYSTEM = `Eres un profesor que crea quizzes de repaso en español a partir de los apuntes de un estudiante.
Reglas:
- Usa SOLO la información del apunte. No inventes datos que no estén ahí.
- Cada pregunta tiene exactamente 4 opciones, una sola correcta.
- Varía la posición de la respuesta correcta entre preguntas.
- Opciones breves (máximo 15 palabras), sin prefijos como "A." o "1)".
- La explicación (1-2 frases) dice por qué la respuesta correcta es la correcta.
- No repitas preguntas.
- Escribe todo en español.`;

export class QuizGenerationError extends Error {}

export async function generateQuestions(opts: {
  title: string;
  topic: string;
  content: string;
  count: number;
  difficulty: string;
}): Promise<Question[]> {
  let output: z.infer<typeof QuizSchema>;
  try {
    const result = await generateText({
      model: MODEL,
      system: SYSTEM,
      prompt: `Tema: ${opts.topic}
Título del apunte: ${opts.title}
Dificultad: ${DIFFICULTY_PROMPT[opts.difficulty] ?? opts.difficulty}
Número de preguntas: ${opts.count}

<apunte>
${opts.content}
</apunte>`,
      output: Output.object({ schema: QuizSchema }),
      maxOutputTokens: 8000,
      providerOptions: { gateway: { models: FALLBACK_MODELS } },
    });
    output = result.output;
  } catch (err) {
    console.error("ai gateway request failed", err);
    if (NoObjectGeneratedError.isInstance(err)) {
      throw new QuizGenerationError("La IA devolvió un formato inválido. Intenta de nuevo.");
    }
    // Gateway errors and APICallError both expose statusCode.
    const status = APICallError.isInstance(err)
      ? err.statusCode
      : (err as { statusCode?: number } | null)?.statusCode;
    if (status === 402) {
      throw new QuizGenerationError("La IA no tiene saldo disponible. Avisa al administrador.");
    }
    if (status === 429) {
      throw new QuizGenerationError("La IA está saturada. Intenta de nuevo en un minuto.");
    }
    if (status === 401 || status === 403) {
      throw new QuizGenerationError("La app no está autorizada para usar la IA. Revisa la configuración.");
    }
    throw new QuizGenerationError("No se pudo contactar a la IA. Intenta de nuevo.");
  }

  const valid = output.questions
    .filter(
      (q) =>
        q.question.trim() &&
        q.options.length === 4 &&
        q.options.every((o) => o.trim()) &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 3,
    )
    .slice(0, opts.count);

  if (valid.length === 0) {
    throw new QuizGenerationError("La IA no generó preguntas válidas. Intenta de nuevo.");
  }
  return valid;
}
