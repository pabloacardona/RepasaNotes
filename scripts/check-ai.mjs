// Checks every configured AI provider and compares the quality of their quizzes.
// Run: node --env-file=.env.local scripts/check-ai.mjs
// It never prints the keys. Each provider writes a quiz from the same note, then the other one grades it.
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { generateText, Output } from "ai";
import { z } from "zod";

const NOTE = `Una transacción en bases de datos es un conjunto de operaciones que se ejecutan como una sola unidad de trabajo. Las propiedades ACID garantizan su fiabilidad: Atomicidad (o todo se aplica o nada), Consistencia (la base pasa de un estado válido a otro válido), Aislamiento (las transacciones concurrentes no se interfieren) y Durabilidad (lo confirmado sobrevive a fallos). COMMIT confirma los cambios y ROLLBACK los deshace. Los niveles de aislamiento (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ y SERIALIZABLE) controlan fenómenos como la lectura sucia, la lectura no repetible y la lectura fantasma. A mayor aislamiento, menor concurrencia y mayor costo de bloqueos.`;

const providers = [];
if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  providers.push({ name: "google", model: createGoogleGenerativeAI()(process.env.GOOGLE_MODEL ?? "gemini-3.1-flash-lite") });
}
if (process.env.GROQ_API_KEY) {
  providers.push({ name: "groq", model: createGroq()(process.env.GROQ_MODEL ?? "openai/gpt-oss-120b") });
}
if (providers.length === 0) {
  console.log("No hay llaves configuradas (GOOGLE_GENERATIVE_AI_API_KEY o GROQ_API_KEY).");
  process.exit(1);
}

const Quiz = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).describe("Exactamente 4 opciones sin prefijos"),
      correctIndex: z.number().int().describe("Índice 0-3"),
      explanation: z.string(),
    }),
  ),
});
const Grade = z.object({
  verdicts: z.array(z.object({ n: z.number().int(), correctAnswerMarked: z.boolean(), onlyOneCorrect: z.boolean(), issue: z.string() })),
});

const ms = (t) => `${((Date.now() - t) / 1000).toFixed(1)}s`;
const short = (e) => String(e?.message ?? e).replace(/\s+/g, " ").slice(0, 180);

const results = [];
for (const p of providers) {
  process.stdout.write(`\n[${p.name}] conectando… `);
  let t = Date.now();
  try {
    await generateText({ model: p.model, prompt: "Responde solo: OK", maxOutputTokens: 200 });
    console.log(`respuesta en ${ms(t)} ✓`);
  } catch (e) {
    console.log(`FALLA ✗ ${short(e)}`);
    results.push({ name: p.name, ok: false, error: short(e) });
    continue;
  }
  t = Date.now();
  try {
    const { output } = await generateText({
      model: p.model,
      system: "Eres un profesor. Crea preguntas de opción múltiple en español, solo con el contenido del apunte. 4 opciones, una sola correcta, explicación breve.",
      prompt: `Dificultad: media\nNúmero de preguntas: 5\n\n<apunte>\n${NOTE}\n</apunte>`,
      output: Output.object({ schema: Quiz }),
      maxOutputTokens: 6000,
    });
    const valid = output.questions.filter((q) => q.options.length === 4 && q.correctIndex >= 0 && q.correctIndex <= 3);
    console.log(`[${p.name}] quiz: ${valid.length}/${output.questions.length} preguntas válidas en ${ms(t)}`);
    results.push({ name: p.name, ok: true, questions: valid, time: (Date.now() - t) / 1000 });
  } catch (e) {
    console.log(`[${p.name}] quiz FALLA ✗ ${short(e)}`);
    results.push({ name: p.name, ok: false, error: short(e) });
  }
}

// Cross grading: each working provider checks the questions written by the others.
const working = results.filter((r) => r.ok);
if (working.length >= 2) {
  console.log("\n--- Evaluación cruzada ---");
  for (const author of working) {
    for (const judge of working) {
      if (judge.name === author.name) continue;
      const jm = providers.find((p) => p.name === judge.name).model;
      const list = author.questions
        .map((q, i) => `${i + 1}. ${q.question}\n${q.options.map((o, k) => `   ${k}) ${o}`).join("\n")}\n   Marcada como correcta: ${q.correctIndex}`)
        .join("\n");
      try {
        const { output } = await generateText({
          model: jm,
          system: "Eres un revisor estricto. Usa solo el apunte. Indica si la respuesta marcada es correcta y si solo hay una opción correcta.",
          prompt: `<apunte>\n${NOTE}\n</apunte>\n\nPreguntas:\n${list}`,
          output: Output.object({ schema: Grade }),
          maxOutputTokens: 3000,
        });
        const good = output.verdicts.filter((v) => v.correctAnswerMarked && v.onlyOneCorrect).length;
        author.score = good;
        console.log(`${judge.name} revisa a ${author.name}: ${good}/${output.verdicts.length} sin problemas`);
        for (const v of output.verdicts.filter((x) => !(x.correctAnswerMarked && x.onlyOneCorrect))) console.log(`   · P${v.n}: ${v.issue}`);
      } catch (e) {
        console.log(`${judge.name} no pudo revisar a ${author.name}: ${short(e)}`);
      }
    }
  }
}

console.log("\n--- Resumen ---");
for (const r of results) {
  console.log(r.ok ? `${r.name}: OK · ${r.questions.length} preguntas · ${r.time.toFixed(1)}s${r.score !== undefined ? ` · revisión ${r.score}/${r.questions.length}` : ""}` : `${r.name}: FALLA · ${r.error}`);
}
const sample = working[0];
if (sample) {
  console.log(`\nEjemplo (${sample.name}):`);
  const q = sample.questions[0];
  console.log(q.question);
  q.options.forEach((o, i) => console.log(`  ${i === q.correctIndex ? "✓" : " "} ${o}`));
}
