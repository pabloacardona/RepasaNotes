import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Question } from "./db/schema";

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number().int(),
      explanation: z.string(),
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
- No repitas preguntas.`;

let client: Anthropic | undefined;
function getClient() {
  if (!client) {
    // Org-level keys (not scoped to a workspace) need the workspace header.
    const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
    client = new Anthropic(
      workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {},
    );
  }
  return client;
}

export class QuizGenerationError extends Error {}

export async function generateQuestions(opts: {
  title: string;
  topic: string;
  content: string;
  count: number;
  difficulty: string;
}): Promise<Question[]> {
  let response;
  try {
    response = await getClient().messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 8000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Tema: ${opts.topic}
Título del apunte: ${opts.title}
Dificultad: ${DIFFICULTY_PROMPT[opts.difficulty] ?? opts.difficulty}
Número de preguntas: ${opts.count}

<apunte>
${opts.content}
</apunte>`,
        },
      ],
      output_config: { format: zodOutputFormat(QuizSchema) },
    });
  } catch (err) {
    console.error("anthropic request failed", err);
    if (err instanceof Anthropic.RateLimitError) {
      throw new QuizGenerationError("La IA está saturada. Intenta de nuevo en un minuto.");
    }
    if (err instanceof Anthropic.AuthenticationError) {
      throw new QuizGenerationError("La clave de la IA no es válida. Revisa ANTHROPIC_API_KEY.");
    }
    if (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message)) {
      throw new QuizGenerationError("La IA no tiene saldo disponible. Avisa al administrador.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new QuizGenerationError("No se pudo contactar a la IA. Intenta de nuevo.");
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new QuizGenerationError("La IA no pudo generar preguntas con este apunte.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new QuizGenerationError("La respuesta de la IA quedó incompleta. Prueba con menos preguntas.");
  }

  const parsed = response.parsed_output;
  if (!parsed) throw new QuizGenerationError("La IA devolvió un formato inválido. Intenta de nuevo.");

  const valid = parsed.questions
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
