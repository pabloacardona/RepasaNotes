import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import type { SharedV4ProviderOptions as ProviderOptions } from "@ai-sdk/provider";
import { APICallError, generateText, NoObjectGeneratedError, Output, type LanguageModel } from "ai";
import { z } from "zod";
import type { Question } from "./db/schema";
import { NOTE_MAX, NOTE_MIN } from "./validators";

// Providers, tried in order: if one fails (rate limit, outage, bad key, invalid output) the next one answers.
//   "google": Gemini through Google AI Studio. Free tier, permanent key. Auth: GOOGLE_GENERATIVE_AI_API_KEY.
//   "groq": open-weights models on Groq. Free tier, permanent key. Auth: GROQ_API_KEY.
//   "anthropic": Claude through the Anthropic API (prepaid credits). Only used when AI_PROVIDER=anthropic.
//   "gateway": Vercel AI Gateway. Auth: AI_GATEWAY_API_KEY. Used when no other key exists, or when AI_PROVIDER=gateway.
// AI_PROVIDER, when set, goes first; the rest that have a key follow as backups.
type ProviderName = "google" | "groq" | "anthropic" | "gateway";
type Candidate = { name: ProviderName; model: LanguageModel; options?: ProviderOptions };

function buildCandidates(): Candidate[] {
  const env = process.env;
  const all: Record<ProviderName, () => Candidate | null> = {
    google: () => (env.GOOGLE_GENERATIVE_AI_API_KEY ? { name: "google", model: google(env.GOOGLE_MODEL ?? "gemini-flash-latest") } : null),
    groq: () => (env.GROQ_API_KEY ? { name: "groq", model: groq(env.GROQ_MODEL ?? "openai/gpt-oss-120b") } : null),
    anthropic: () => (env.AI_PROVIDER === "anthropic" && env.ANTHROPIC_API_KEY ? { name: "anthropic", model: anthropic(env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5") } : null),
    gateway: () => ({
      name: "gateway",
      model: (env.AI_GATEWAY_MODEL ?? "openai/gpt-oss-120b") as unknown as LanguageModel,
      options: { gateway: { models: ["deepseek/deepseek-v4-flash"] } },
    }),
  };
  const preferred = env.AI_PROVIDER as ProviderName | undefined;
  const order: ProviderName[] = ["google", "groq", "anthropic", "gateway"];
  if (preferred && order.includes(preferred)) {
    order.splice(order.indexOf(preferred), 1);
    order.unshift(preferred);
  }
  const list = order.map((n) => all[n]()).filter((c): c is Candidate => c !== null);
  // The gateway is a last resort: only keep it when nothing else is configured or it was asked for.
  const real = list.filter((c) => c.name !== "gateway");
  return real.length > 0 && preferred !== "gateway" ? real : list;
}
const CANDIDATES = buildCandidates();

// Runs one request against each provider in turn and returns the first success.
async function withFallback<T>(run: (c: Candidate) => Promise<T>): Promise<T> {
  let last: unknown;
  for (const c of CANDIDATES) {
    try {
      return await run(c);
    } catch (err) {
      last = err;
      const why = err instanceof Error ? err.message.slice(0, 160).replace(/\s+/g, " ") : "unknown error";
      console.warn(`ai provider "${c.name}" failed: ${why}${c === CANDIDATES[CANDIDATES.length - 1] ? "" : " (trying the next one)"}`);
    }
  }
  throw last;
}

export class AIGenerationError extends Error {}

// Maps SDK / provider failures to user-facing messages.
function toUserError(err: unknown): AIGenerationError {
  console.error("ai request failed", err);
  if (NoObjectGeneratedError.isInstance(err)) {
    return new AIGenerationError("La IA devolvió un formato inválido. Intenta de nuevo.");
  }
  const status = APICallError.isInstance(err)
    ? err.statusCode
    : (err as { statusCode?: number } | null)?.statusCode;
  const message = err instanceof Error ? err.message : "";
  // Anthropic reports an empty balance as a 400 with this text.
  if (status === 402 || /credit balance/i.test(message)) {
    return new AIGenerationError("La IA no tiene saldo disponible. Avisa al administrador.");
  }
  if (status === 429 || status === 529) {
    return new AIGenerationError("La IA está saturada. Intenta de nuevo en un minuto.");
  }
  if (status === 401 || status === 403 || /api key|unauthenticated/i.test(message)) {
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

const TICK = "`";
const FENCE = "```";

const QUIZ_SYSTEM = `Eres un profesor que crea quizzes de repaso en español a partir de los apuntes de un estudiante.
Reglas:
- Usa SOLO la información del apunte. No inventes datos que no estén ahí.
- Cada pregunta tiene exactamente 4 opciones, una sola correcta.
- Varía la posición de la respuesta correcta entre preguntas.
- Opciones breves (máximo 15 palabras), sin prefijos como "A." o "1)".
- La explicación (1-2 frases) dice por qué la respuesta correcta es la correcta.
- No repitas preguntas.
- Escribe todo en español.
- Formato visual (solo cuando aporte): si la pregunta trata de código, incluye el fragmento en un bloque con tres comillas invertidas y el lenguaje (${FENCE}js ... ${FENCE}), de pocas líneas. Usa ${TICK}código${TICK} en línea para nombres de funciones o variables. Una opción puede ser un fragmento corto en línea.
- Si el apunte contiene datos numéricos o un bloque ${FENCE}chart, puedes incluir un gráfico en el enunciado con un bloque ${FENCE}chart con JSON válido: {"type":"bar"|"line"|"pie","title":"...","labels":[...],"values":[...]} (máximo 8 puntos, valores numéricos). No inventes datos que no estén en el apunte.`;

export async function generateQuestions(opts: {
  title: string;
  topic: string;
  content: string;
  count: number;
  difficulty: string;
  variation?: boolean;
}): Promise<Question[]> {
  let output: z.infer<typeof QuizSchema>;
  try {
    const result = await withFallback((c) => generateText({
      model: c.model,
      system: QUIZ_SYSTEM,
      prompt: `Tema: ${opts.topic}
Título del apunte: ${opts.title}
Dificultad: ${DIFFICULTY_PROMPT[opts.difficulty] ?? opts.difficulty}
Número de preguntas: ${opts.count}
${opts.variation ? `Este quiz es una variante única para un estudiante: formula las preguntas con enunciados originales, elige conceptos del apunte de forma aleatoria y cambia el orden de los temas. Semilla: ${Math.random().toString(36).slice(2, 8)}
` : ""}
<apunte>
${opts.content}
</apunte>`,
      output: Output.object({ schema: QuizSchema }),
      maxOutputTokens: 8000,
      providerOptions: c.options,
    }));
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

// ---------- Reinforcement quiz (from missed questions) ----------

const REINFORCE_SYSTEM = `${QUIZ_SYSTEM}

Tarea especial: el estudiante falló algunas preguntas. Crea preguntas NUEVAS que refuercen exactamente esos conceptos.
- No copies ni parafrasees las preguntas originales: evalúa el mismo concepto desde otros ángulos (definición, ejemplo, aplicación, comparación, causa-efecto).
- Usa las respuestas incorrectas del estudiante para detectar la confusión y crea distractores que la pongan a prueba.
- Reparte las preguntas entre todos los conceptos fallados.
- La explicación debe aclarar la confusión típica, no solo repetir la respuesta.`;

export async function generateReinforcement(opts: {
  title: string;
  topic: string;
  noteContent: string | null;
  missed: { question: string; correct: string; given: string | null }[];
  count: number;
  difficulty: string;
}): Promise<Question[]> {
  const missedText = opts.missed
    .map(
      (m, i) =>
        `${i + 1}. ${m.question}\n   Respuesta correcta: ${m.correct}\n   Respondió: ${m.given ?? "(sin responder)"}`,
    )
    .join("\n");

  let output: z.infer<typeof QuizSchema>;
  try {
    const result = await withFallback((c) => generateText({
      model: c.model,
      system: REINFORCE_SYSTEM,
      prompt: `Tema: ${opts.topic}
Título: ${opts.title}
Dificultad: ${DIFFICULTY_PROMPT[opts.difficulty] ?? opts.difficulty}
Número de preguntas: ${opts.count}

<preguntas_falladas>
${missedText}
</preguntas_falladas>

${
  opts.noteContent
    ? `<apunte>\n${opts.noteContent}\n</apunte>`
    : "No hay apunte disponible: usa solo la información que se deduce de las preguntas falladas y sus respuestas correctas."
}`,
      output: Output.object({ schema: QuizSchema }),
      maxOutputTokens: 8000,
      providerOptions: c.options,
    }));
    output = result.output;
  } catch (err) {
    throw toUserError(err);
  }

  const originals = new Set(opts.missed.map((m) => m.question.trim().toLowerCase()));
  const valid = output.questions
    .filter(
      (q) =>
        q.question.trim() &&
        !originals.has(q.question.trim().toLowerCase()) &&
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
- Céntrate exclusivamente en el tema pedido. Nada de relleno, historia irrelevante ni temas vecinos.
- Si el tema es muy amplio, acótalo a sus conceptos esenciales y dilo en la introducción.
- Solo información correcta y verificable. Si algo depende de la versión o del contexto, indícalo.
- Usa terminología técnica exacta y define cada concepto clave.
- Incluye ejemplos concretos (código corto si el tema es de programación, casos o cifras si no).
- Incluye errores o confusiones frecuentes.
- El código va en bloques con tres comillas invertidas y lenguaje (${FENCE}js ... ${FENCE}). Si un dato numérico se entiende mejor con un gráfico, añade un bloque ${FENCE}chart con JSON {"type":"bar"|"line"|"pie","title":"...","labels":[...],"values":[...]}; solo con datos reales y verificables.

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
    const result = await withFallback((c) => generateText({
      model: c.model,
      system: CONDENSE_SYSTEM,
      prompt: `Nombre del archivo: ${opts.titleHint}

<documento>
${opts.text}
</documento>`,
      output: Output.object({ schema: NoteSchema }),
      maxOutputTokens: 12000,
      providerOptions: c.options,
    }));
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
  level: string;
}): Promise<{ title: string; topic: string; content: string }> {
  let output: z.infer<typeof NoteSchema>;
  try {
    const result = await withFallback((c) => generateText({
      model: c.model,
      system: NOTE_SYSTEM,
      prompt: `Tema a estudiar: ${opts.topic}
Nivel: ${LEVEL_PROMPT[opts.level] ?? opts.level}`,
      output: Output.object({ schema: NoteSchema }),
      maxOutputTokens: 12000,
      providerOptions: c.options,
    }));
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

// ---------- Hints (cost one life in the quiz) ----------

const HintSchema = z.object({
  hint: z.string().describe("Pista de 1-2 frases que ayuda a razonar hacia la respuesta sin nombrarla"),
});

const HINT_SYSTEM = `Eres un tutor. Das UNA pista breve para una pregunta de opción múltiple.
Reglas:
- La pista debe permitir inferir cuál es la correcta, pero NO digas la letra, el número ni el texto exacto de la opción correcta.
- Puedes descartar una idea equivocada o señalar el concepto clave que hay que recordar.
- Máximo 2 frases, en español.`;

export async function generateHint(q: Question): Promise<string> {
  try {
    const result = await withFallback((c) => generateText({
      model: c.model,
      system: HINT_SYSTEM,
      prompt: `Pregunta: ${q.question}
Opciones:
${q.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}
Opción correcta (secreta, no la reveles): ${q.correctIndex + 1}
Explicación: ${q.explanation}`,
      output: Output.object({ schema: HintSchema }),
      maxOutputTokens: 400,
      providerOptions: c.options,
    }));
    const hint = result.output.hint.trim();
    if (!hint) throw new AIGenerationError("La IA no devolvió una pista.");
    return hint;
  } catch (err) {
    throw err instanceof AIGenerationError ? err : toUserError(err);
  }
}

// ---------- Notes from photos ----------

const PHOTO_SYSTEM = `Eres un asistente que convierte fotografías de apuntes (cuaderno, pizarra, diapositivas, libro) en un apunte de estudio en español.
Reglas:
- Transcribe fielmente lo que se ve: no inventes ni agregues datos que no estén en las imágenes. Si algo es ilegible, omítelo.
- Respeta el orden de las imágenes y une el contenido en un solo apunte coherente.
- Estructura el content en texto plano con encabezados '## ' y viñetas '- '. Corrige la ortografía evidente.
- El código va en bloques con tres comillas invertidas y lenguaje (${FENCE}js ... ${FENCE}). Si ves un gráfico con valores legibles, represéntalo con un bloque ${FENCE}chart con JSON {"type":"bar"|"line"|"pie","title":"...","labels":[...],"values":[...]}; si no se pueden leer los valores, descríbelo en texto.
- Longitud del content: máximo ${NOTE_MAX} caracteres.
- suitable=false solo si las imágenes no contienen texto de estudio legible.`;

export async function transcribeNotes(images: { data: Uint8Array; mediaType: string }[], titleHint: string) {
  const vision = CANDIDATES.filter((c) => c.name !== "groq");
  if (vision.length === 0) throw new AIGenerationError("La IA configurada no puede leer imágenes. Configura GOOGLE_GENERATIVE_AI_API_KEY.");
  let output: z.infer<typeof NoteSchema> | undefined;
  let last: unknown;
  for (const c of vision) {
    try {
      const result = await generateText({
        model: c.model,
        system: PHOTO_SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `Nombre sugerido: ${titleHint}. Convierte estas ${images.length} imagen(es) en un apunte.` },
              ...images.map((im) => ({ type: "image" as const, image: im.data, mediaType: im.mediaType })),
            ],
          },
        ],
        output: Output.object({ schema: NoteSchema }),
        maxOutputTokens: 12000,
        providerOptions: c.options,
      });
      output = result.output;
      break;
    } catch (err) {
      last = err;
      console.warn(`ai vision provider "${c.name}" failed`);
    }
  }
  if (!output) throw toUserError(last);
  if (!output.suitable) {
    throw new AIGenerationError(output.reason?.trim() || "No se pudo leer texto de estudio en las fotos.");
  }
  const content = fitLength(output.content);
  if (content.length < 20) throw new AIGenerationError("No se pudo leer suficiente texto en las fotos. Prueba con mejor luz y más cerca.");
  return {
    title: output.title.trim().slice(0, 120) || titleHint,
    topic: output.topic.trim().slice(0, 60) || "",
    content,
  };
}
