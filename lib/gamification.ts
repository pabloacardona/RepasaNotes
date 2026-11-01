// Game rules: XP, achievements and daily goals. Pure functions shared by the server (profile) and the client (UI).
// Everything is derived from finished quizzes and saved notes, so it needs no extra tables.

export const DAILY_GOAL = 10; // questions answered per day
export const DAILY_BONUS_XP = 15;
export const QUIZ_BASE_XP = 20;
export const PERFECT_BONUS_XP = 30;

// XP a finished quiz is worth: a tenth of its points, plus a completion bonus and a perfect-score bonus.
export function xpForQuiz(points: number, score: number, total: number) {
  return Math.round(points / 10) + QUIZ_BASE_XP + (total > 0 && score === total ? PERFECT_BONUS_XP : 0);
}

export type Facts = {
  quizzes: number;
  notes: number;
  correct: number;
  perfect: number;
  hardWins: number;
  bestCombo: number;
  bestStreakDays: number;
  topics: number;
  conquered: number; // topics at Oro or above
  rankTier: number; // index in TIERS
};

export const RARITIES = [
  { name: "Común", color: "#9aa3b2" },
  { name: "Poco común", color: "#2fd68f" },
  { name: "Rara", color: "#4aa3ff" },
  { name: "Épica", color: "#b05cf0" },
  { name: "Legendaria", color: "#ff9a2e" },
] as const;

export type AchievementDef = {
  id: string;
  emoji: string;
  name: string;
  category: "Estudio" | "Combate" | "Constancia" | "Conquista";
  text: (goal: number) => string;
  goals: [number, number, number, number]; // one goal per tier
  value: (f: Facts) => number;
};

// Each achievement has four tiers (like WoW meta-achievements). Reaching a tier is worth 10, 25, 50 and 100 points.
export const TIER_POINTS = [10, 25, 50, 100] as const;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "quizzes", emoji: "⚔️", name: "Aventurero", category: "Estudio", text: (g) => `Termina ${g} quiz${g === 1 ? "" : "zes"}`, goals: [1, 5, 15, 40], value: (f) => f.quizzes },
  { id: "correct", emoji: "🧠", name: "Mente brillante", category: "Estudio", text: (g) => `Acierta ${g} preguntas`, goals: [25, 100, 300, 800], value: (f) => f.correct },
  { id: "notes", emoji: "📜", name: "Escriba", category: "Estudio", text: (g) => `Guarda ${g} apunte${g === 1 ? "" : "s"}`, goals: [1, 5, 12, 30], value: (f) => f.notes },
  { id: "topics", emoji: "🧭", name: "Cartógrafo", category: "Estudio", text: (g) => `Estudia ${g} temas distintos`, goals: [2, 4, 7, 12], value: (f) => f.topics },
  { id: "combo", emoji: "🔥", name: "Cadena de aciertos", category: "Combate", text: (g) => `Acierta ${g} seguidas en un quiz`, goals: [3, 5, 10, 20], value: (f) => f.bestCombo },
  { id: "perfect", emoji: "💎", name: "Victoria impecable", category: "Combate", text: (g) => `Saca 100% en ${g} quiz${g === 1 ? "" : "zes"}`, goals: [1, 3, 8, 20], value: (f) => f.perfect },
  { id: "hard", emoji: "🐉", name: "Cazador de jefes", category: "Combate", text: (g) => `Aprueba ${g} quiz${g === 1 ? "" : "zes"} difícil${g === 1 ? "" : "es"} (70%+)`, goals: [1, 3, 8, 20], value: (f) => f.hardWins },
  { id: "days", emoji: "🕯️", name: "Llama eterna", category: "Constancia", text: (g) => `Estudia ${g} días seguidos`, goals: [2, 5, 10, 30], value: (f) => f.bestStreakDays },
  { id: "conquered", emoji: "🏰", name: "Conquistador", category: "Conquista", text: (g) => `Conquista ${g} tema${g === 1 ? "" : "s"} (Oro o más)`, goals: [1, 3, 6, 10], value: (f) => f.conquered },
  { id: "climb", emoji: "🪽", name: "Escalador", category: "Conquista", text: (g) => `Llega al rango ${["", "Bronce", "Plata", "Oro", "Platino", "Esmeralda", "Diamante", "Maestro"][g] ?? ""}`, goals: [1, 3, 5, 7], value: (f) => f.rankTier },
];

export type AchievementState = {
  id: string;
  emoji: string;
  name: string;
  category: AchievementDef["category"];
  tier: number; // 0 = locked, 1..4 reached
  value: number;
  goal: number; // next goal, or the last one when complete
  prev: number; // goal of the tier already reached
  text: string;
  complete: boolean;
  points: number; // points earned so far
  rarity: (typeof RARITIES)[number];
};

export function evaluateAchievements(f: Facts): AchievementState[] {
  return ACHIEVEMENTS.map((a) => {
    const value = a.value(f);
    const tier = a.goals.filter((g) => value >= g).length;
    const complete = tier === 4;
    const goal = a.goals[Math.min(tier, 3)];
    return {
      id: a.id,
      emoji: a.emoji,
      name: a.name,
      category: a.category,
      tier,
      value: Math.min(value, a.goals[3]),
      goal,
      prev: tier > 0 ? a.goals[tier - 1] : 0,
      text: a.text(goal),
      complete,
      points: TIER_POINTS.slice(0, tier).reduce((x, y) => x + y, 0),
      rarity: RARITIES[[0, 0, 2, 3, 4][tier]],
    };
  });
}

export type Quest = { id: string; emoji: string; label: string; value: number; goal: number; done: boolean };

export function dailyQuests(today: { answered: number; correct: number; quizzes: number }): Quest[] {
  const q = (id: string, emoji: string, label: string, value: number, goal: number): Quest => ({
    id,
    emoji,
    label,
    value: Math.min(value, goal),
    goal,
    done: value >= goal,
  });
  return [
    q("answer", "✍️", `Responde ${DAILY_GOAL} preguntas`, today.answered, DAILY_GOAL),
    q("correct", "🎯", "Acierta 7 preguntas", today.correct, 7),
    q("quiz", "🏁", "Termina 1 quiz", today.quizzes, 1),
  ];
}
