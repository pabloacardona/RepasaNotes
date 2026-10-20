import "server-only";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import type { Question } from "./db/schema";
import { NOTE_MAX, NOTE_MIN } from "./validators";

// Open-weights models served through Vercel AI Gateway.
// Auth: VERCEL_OIDC_TOKEN on Vercel / after `vercel env pull`, or AI_GATEWAY_API_KEY.
const MODEL = process.env.AI_GATEWAY_MODEL ?? "openai/gpt-oss-120b";
const FALLBACK_MODELS = ["deepseek/deepseek-v4-flash"];

export class AIGenerationError extends Error {}

// Maps SDK / gateway failures to user-facing messages.
function toUserError(err: unknown): AIGenerationError {
  console.error("ai gateway request failed", err);
  if (NoObjectGeneratedError.isInstance(err)) {
    return new AIGenerationError("La IA devolvió un formato inválido. Intenta de nuevo.");
  }
  // Gateway errors and APICallError both expose statusCode.
  const status = APICallError.isInstance(err)
    ? err.statusCode
    : (err as { statusCode?: number } | null)?.statusCode;
  if (status === 402) {
    return new AIGenerationError("La IA no tiene saldo disponible. Avisa al administrador.");
  }
  if (status === 429) {
    return new AIGenerationError("La IA está saturada. Intenta de nuevo en un minuto.");
  }
  if (status === 401 || status === 403) {
    return new AIGenerationError("La app no está autorizada para usar la IA. Revisa la configuración.");
  }
  return new AIGenerationError("No se pudo contactar a la IA. Intenta de nuevo.");
}

// ---------- Quiz generation ----------

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

const QUIZ_SYSTEM = `Eres un profesor que crea quizzes de repaso en español a partir de los apuntes de un estudiante.
Reglas:
- Usa SOLO la información del apunte. No inventes datos que no estén ahí.
- Cada pregunta tiene exactamente 4 opciones, una sola correcta.
- Varía la posición de la respuesta correcta entre preguntas.
- Opciones breves (máximo 15 palabras), sin prefijos como "A." o "1)".
- La explicación (1-2 frases) dice por qué la respuesta correcta es la correcta.
- No repitas preguntas.
- Escribe todo en español.`;

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
      system: QUIZ_SYSTEM,
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
    throw toUserError(err);
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
    throw new AIGenerationError("La IA no generó preguntas válidas. Intenta de nuevo.");
  }
  return valid;
}

// ---------- Note generation ----------

const NoteSchema = z.object({
  suitable: z
    .boolean()
    .describe("false si el tema no es un tema de estudio válido o es demasiado ambiguo para escribir apuntes"),
  reason: z.string().describe("Si suitable es false, explica en una frase por qué; si no, cadena vacía"),
  title: z.string().describe("Título específico del apunte, máximo 80 caracteres"),
  topic: z.string().describe("Materia o área general, 1 a 3 palabras (ej. 'Node.js', 'Bases de datos')"),
  content: z.string().describe("Cuerpo completo del apunte en texto plano con encabezados '## ' y viñetas '- '"),
});

const LEVEL_PROMPT: Record<string, string> = {
  basico: "básico: para alguien que empieza; define todo término técnico la primera vez que aparece",
  intermedio: "intermedio: asume las bases; prioriza relaciones entre conceptos, casos de uso y errores frecuentes",
  avanzado: "avanzado: profundiza en detalles técnicos, compensaciones (trade-offs), casos límite y buenas prácticas",
};

const NOTE_SYSTEM = `Eres un profesor experto que escribe apuntes de estudio en español, precisos y especializados.
Objetivo: un apunte que sirva para repasar el tema y del que luego se puedan sacar preguntas de opción múltiple.

Reglas de contenido:
- Céntrate exclusivamente en el tema y enfoque pedidos. Nada de relleno, historia irrelevante ni temas vecinos.
- Si el tema es muy amplio, acótalo a sus conceptos esenciales y dilo en la introducción.
- Solo información correcta y verificable. Si algo depende de la versión o del contexto, indícalo.
- Usa terminología técnica exacta y define cada concepto clave.
- Incluye ejemplos concretos (código corto si el tema es de programación, casos o cifras si no).
- Incluye errores o confusiones frecuentes.

Estructura del campo content (texto plano, sin negritas ni tablas):
## Introducción  (2-3 frases: qué es y por qué importa)
## Conceptos clave  (definiciones en viñetas '- ')
## Cómo funciona / Desarrollo  (explicación ordenada, puede tener varias secciones '## ')
## Ejemplos
## Errores comunes
## Resumen  (5-8 viñetas con lo esencial para el examen)

Longitud del content: entre ${Math.round(NOTE_MAX * 0.4)} y ${Math.round(NOTE_MAX * 0.8)} caracteres.

Si el tema no es un tema de estudio (por ejemplo, texto sin sentido, algo dañino o una petición que no es académica), responde suitable=false con la razón y deja title, topic y content vacíos.`;

const CONDENSE_SYSTEM = `Eres un profesor que convierte documentos largos en apuntes de estudio en español.
Reglas:
- Usa SOLO la información del documento. No agregues datos externos.
- Conserva definiciones, datos, fórmulas, ejemplos y relaciones importantes; elimina relleno, índices, bibliografía y repeticiones.
- Si el documento está en otro idioma, escribe el apunte en español conservando los términos técnicos.
- Estructura el content en texto plano con encabezados '## ' y viñetas '- ', terminando con '## Resumen'.
- Longitud del content: entre ${Math.round(NOTE_MAX * 0.5)} y ${Math.round(NOTE_MAX * 0.9)} caracteres.
- suitable=false solo si el documento no tiene contenido de estudio (por ejemplo, está vacío o es ilegible).`;

// Condenses a long uploaded document into a note that fits NOTE_MAX.
export async function condenseDocument(opts: {
  text: string;
  titleHint: string;
}): Promise<{ title: string; topic: string; content: string }> {
  let output: z.infer<typeof NoteSchema>;
  try {
    const result = await generateText({
      model: MODEL,
      system: CONDENSE_SYSTEM,
      prompt: `Nombre del archivo: ${opts.titleHint}

<documento>
${opts.text}
</documento>`,
      output: Output.object({ schema: NoteSchema }),
      maxOutputTokens: 12000,
      providerOptions: { gateway: { models: FALLBACK_MODELS } },
    });
    output = result.output;
  } catch (err) {
    throw toUserError(err);
  }

  if (!output.suitable) {
    throw new AIGenerationError(output.reason?.trim() || "El documento no tiene contenido de estudio.");
  }
  const content = fitLength(output.content);
  if (content.length < NOTE_MIN) {
    throw new AIGenerationError("La IA generó un resumen demasiado corto. Intenta de nuevo.");
  }
  return {
    title: output.title.trim().slice(0, 120) || opts.titleHint,
    topic: output.topic.trim().slice(0, 60) || "General",
    content,
  };
}

function fitLength(text: string) {
  const clean = text
    .replace(/\r\n/g, "\n")
    .replace(/\*\*/g, "")
    // Drop *italic* markers the model sometimes adds; keeps "- " bullets and math like "a * b".
    .replace(/(^|[\s(])\*([^*\s](?:[^*\n]*[^*\s])?)\*(?=[\s.,;:)]|$)/gm, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (clean.length <= NOTE_MAX) return clean;
  // Cut at the last paragraph break that fits.
  const cut = clean.slice(0, NOTE_MAX);
  const lastBreak = cut.lastIndexOf("\n\n");
  return (lastBreak > NOTE_MIN ? cut.slice(0, lastBreak) : cut).trim();
}

export async function generateNote(opts: {
  topic: string;
  focus?: string;
  level: string;
}): Promise<{ title: string; topic: string; content: string }> {
  let output: z.infer<typeof NoteSchema>;
  try {
    const result = await generateText({
      model: MODEL,
      system: NOTE_SYSTEM,
      prompt: `Tema a estudiar: ${opts.topic}
Enfoque específico: ${opts.focus?.trim() || "los conceptos esenciales del tema"}
Nivel: ${LEVEL_PROMPT[opts.level] ?? opts.level}`,
      output: Output.object({ schema: NoteSchema }),
      maxOutputTokens: 12000,
      providerOptions: { gateway: { models: FALLBACK_MODELS } },
    });
    output = result.output;
  } catch (err) {
    throw toUserError(err);
  }

  if (!output.suitable) {
    throw new AIGenerationError(
      output.reason?.trim() || "Ese tema no sirve para un apunte de estudio. Prueba con otro.",
    );
  }

  const content = fitLength(output.content);
  if (content.length < NOTE_MIN) {
    throw new AIGenerationError("La IA generó un apunte demasiado corto. Intenta de nuevo.");
  }

  return {
    title: output.title.trim().slice(0, 120) || opts.topic.slice(0, 120),
    topic: (output.topic.trim() || opts.topic).slice(0, 60),
    content,
  };
}
