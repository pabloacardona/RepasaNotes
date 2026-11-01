// Game rules: XP, levels, badges and daily goals. Pure functions shared by the server (profile) and the client (UI).
// Everything is derived from finished quizzes and saved notes, so it needs no extra tables.

export const DAILY_GOAL = 10; // questions answered per day
export const DAILY_BONUS_XP = 15;
export const QUIZ_BASE_XP = 20;
export const PERFECT_BONUS_XP = 30;

// XP a finished quiz is worth: a tenth of its points, plus a completion bonus and a perfect-score bonus.
export function xpForQuiz(points: number, score: number, total: number) {
  return Math.round(points / 10) + QUIZ_BASE_XP + (total > 0 && score === total ? PERFECT_BONUS_XP : 0);
}

const TITLES = ["Novato", "Aprendiz", "Estudiante", "Explorador", "Estratega", "Erudito", "Maestro", "Sabio", "Leyenda"];

// Total XP needed to reach a level: 120, 360, 720, 1200, 1800...
export const xpToReach = (level: number) => 60 * (level - 1) * level;

export type LevelInfo = {
  level: number;
  title: string;
  xp: number;
  into: number; // XP gained inside this level
  need: number; // XP this level spans
  pct: number; // 0..100
  next: string;
};

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  while (xp >= xpToReach(level + 1)) level += 1;
  const floor = xpToReach(level);
  const need = xpToReach(level + 1) - floor;
  const into = xp - floor;
  return {
    level,
    title: TITLES[Math.min(level - 1, TITLES.length - 1)],
    xp,
    into,
    need,
    pct: Math.min(100, Math.round((into / need) * 100)),
    next: TITLES[Math.min(level, TITLES.length - 1)],
  };
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
  level: number;
};

type BadgeDef = { id: string; emoji: string; name: string; desc: string; goal: number; value: (f: Facts) => number };

export const BADGES: BadgeDef[] = [
  { id: "first", emoji: "🎯", name: "Primer paso", desc: "Termina tu primer quiz", goal: 1, value: (f) => f.quizzes },
  { id: "quizzes5", emoji: "📚", name: "Constante", desc: "Termina 5 quizzes", goal: 5, value: (f) => f.quizzes },
  { id: "quizzes20", emoji: "🏫", name: "Ratón de biblioteca", desc: "Termina 20 quizzes", goal: 20, value: (f) => f.quizzes },
  { id: "perfect", emoji: "🏆", name: "Perfección", desc: "Saca 100% en un quiz", goal: 1, value: (f) => f.perfect },
  { id: "perfect3", emoji: "💎", name: "Impecable", desc: "Saca 100% en 3 quizzes", goal: 3, value: (f) => f.perfect },
  { id: "combo5", emoji: "🔥", name: "En llamas", desc: "Acierta 5 seguidas", goal: 5, value: (f) => f.bestCombo },
  { id: "combo10", emoji: "☄️", name: "Imparable", desc: "Acierta 10 seguidas", goal: 10, value: (f) => f.bestCombo },
  { id: "days3", emoji: "📅", name: "Tres días", desc: "Estudia 3 días seguidos", goal: 3, value: (f) => f.bestStreakDays },
  { id: "days7", emoji: "🗓️", name: "Semana completa", desc: "Estudia 7 días seguidos", goal: 7, value: (f) => f.bestStreakDays },
  { id: "days30", emoji: "👑", name: "Hábito de hierro", desc: "Estudia 30 días seguidos", goal: 30, value: (f) => f.bestStreakDays },
  { id: "notes5", emoji: "📝", name: "Apuntador", desc: "Guarda 5 apuntes", goal: 5, value: (f) => f.notes },
  { id: "correct100", emoji: "🎓", name: "Cerebrito", desc: "100 respuestas correctas", goal: 100, value: (f) => f.correct },
  { id: "hard", emoji: "🧗", name: "Modo difícil", desc: "Aprueba un quiz difícil (70%+)", goal: 1, value: (f) => f.hardWins },
  { id: "topics3", emoji: "🧭", name: "Explorador", desc: "Estudia 3 temas distintos", goal: 3, value: (f) => f.topics },
  { id: "level5", emoji: "⭐", name: "Nivel 5", desc: "Llega al nivel 5", goal: 5, value: (f) => f.level },
];

export type BadgeState = { id: string; emoji: string; name: string; desc: string; value: number; goal: number; unlocked: boolean };

export function evaluateBadges(f: Facts): BadgeState[] {
  return BADGES.map((b) => {
    const value = Math.min(b.value(f), b.goal);
    return { id: b.id, emoji: b.emoji, name: b.name, desc: b.desc, value, goal: b.goal, unlocked: value >= b.goal };
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
