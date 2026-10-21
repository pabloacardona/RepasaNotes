// Maps quiz progress to the mascot's mood and the world's weather.
// Pure functions: used by the quiz runner (client) and the results page.

export const MOODS = [
  "idle",
  "curious",
  "thinking",
  "sleepy",
  "happy",
  "excited",
  "onFire",
  "comeback",
  "confident",
  "oops",
  "sad",
  "shocked",
  "crying",
  "nervous",
  "determined",
  "celebrating",
  "proud",
  "relieved",
  "heartbroken",
] as const;

export type Mood = (typeof MOODS)[number];

export const MOOD_LABEL: Record<Mood, string> = {
  idle: "Tranquilo",
  curious: "Curioso",
  thinking: "Pensativo",
  sleepy: "Con sueño",
  happy: "Feliz",
  excited: "Emocionado",
  onFire: "¡En llamas!",
  comeback: "¡Remontada!",
  confident: "Confiado",
  oops: "Ups",
  sad: "Triste",
  shocked: "En shock",
  crying: "Llorando",
  nervous: "Nervioso",
  determined: "Decidido",
  celebrating: "¡De fiesta!",
  proud: "Orgulloso",
  relieved: "Aliviado",
  heartbroken: "Desanimado",
};

export type QuizSignals = {
  total: number;
  answered: number;
  hits: number;
  streak: number;
  missStreak: number;
  brokenStreak: number; // streak length lost on the last miss
  missStreakBefore: number; // consecutive misses right before the last hit
  lastResult: "hit" | "miss" | null;
  msSinceAnswer: number; // time since the last answer
  msOnQuestion: number; // time on the current question without answering
  currentAnswered: boolean;
  finished: boolean;
};

const REACTION_MS = 3800;

export function moodFor(s: QuizSignals): Mood {
  const accuracy = s.answered ? s.hits / s.answered : 0;

  if (s.finished) {
    const pct = s.total ? s.hits / s.total : 0;
    if (pct === 1) return "celebrating";
    if (pct >= 0.7) return "proud";
    if (pct >= 0.5) return "relieved";
    if (pct >= 0.3) return "sad";
    return "heartbroken";
  }

  // Short reaction right after answering.
  if (s.lastResult && s.msSinceAnswer < REACTION_MS) {
    if (s.lastResult === "hit") {
      if (s.streak >= 5) return "onFire";
      if (s.streak >= 3) return "excited";
      if (s.brokenStreak === 0 && s.streak === 1 && s.missStreakBefore >= 2) return "comeback";
      return "happy";
    }
    if (s.brokenStreak >= 3) return "shocked";
    if (s.missStreak >= 3) return "crying";
    if (s.missStreak === 2) return "sad";
    return "oops";
  }

  // Waiting on the current question.
  if (!s.currentAnswered) {
    if (s.msOnQuestion > 25000) return "sleepy";
    if (s.msOnQuestion > 9000) return "thinking";
  }

  // Baseline from overall performance.
  if (s.answered >= 3 && accuracy >= 0.8) return "confident";
  if (s.answered >= 3 && accuracy < 0.4) return "nervous";
  if (s.lastResult === "miss") return "determined";
  if (s.answered === 0) return "idle";
  return "curious";
}

// 1 = sunny, 0 = storm. Smoothed so one answer never flips the whole sky.
export function weatherFor(hits: number, answered: number, streak: number, missStreak: number) {
  const base = (hits + 1.4) / (answered + 2);
  const w = base + Math.min(streak, 5) * 0.04 - Math.min(missStreak, 4) * 0.07;
  return Math.max(0, Math.min(1, w));
}

export type WorldState = {
  mood: Mood;
  weather: number; // 0 storm .. 1 sunny
  bloom: number; // 0..1 flowers grown, from hits
  streak: number;
  pulse: number; // increments on every answer to trigger one-shot effects
};
