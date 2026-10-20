import { z } from "zod";

export const NOTE_MIN = 200;
export const NOTE_MAX = 8000;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(80),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido"),
  password: z.string().min(8, "Mínimo 8 caracteres").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export const noteSchema = z.object({
  title: z.string().trim().min(2, "Escribe un título").max(120),
  topic: z.string().trim().min(2, "Escribe un tema").max(60),
  content: z
    .string()
    .trim()
    .min(NOTE_MIN, `El apunte necesita al menos ${NOTE_MIN} caracteres`)
    .max(NOTE_MAX, `Máximo ${NOTE_MAX} caracteres`),
});

export const generateQuizSchema = z.object({
  noteId: z.string().uuid("Elige un apunte"),
  count: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  difficulty: z.enum(["facil", "media", "dificil"]),
});

export const generateNoteSchema = z.object({
  topic: z.string().trim().min(2, "Escribe el tema que quieres repasar").max(80, "Máximo 80 caracteres"),
  focus: z.string().trim().max(200, "Máximo 200 caracteres").optional().default(""),
  level: z.enum(["basico", "intermedio", "avanzado"]),
});

export const submitQuizSchema = z.object({
  answers: z.array(z.number().int().min(-1).max(3)),
});

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  facil: "Fácil",
  media: "Media",
  dificil: "Difícil",
};
