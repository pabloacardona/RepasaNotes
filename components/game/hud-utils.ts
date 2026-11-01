export type HudData = {
  rank: { tierIndex: number; division: number | null; label: string; pct: number; toNext: number; nextLabel: string | null; xp: number; color: string };
  streak: { current: number; best: number; activeToday: boolean };
  today: { answered: number; goal: number };
  week: { date: string; count: number }[];
  stats: { accuracy: number | null; answered: number; quizzes: number };
};

export const MILESTONES = [3, 7, 14, 30, 60, 100];
export const DAY_LETTER = ["L", "M", "X", "J", "V", "S", "D"];
export const DAY_NAME = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export const dayIndex = (date: string) => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;

// Hours and minutes left in the Colombia day (UTC-5, no daylight saving).
export function leftToday() {
  const ms = 24 * 3600 * 1000 - ((Date.now() - 5 * 3600 * 1000) % (24 * 3600 * 1000));
  return { h: Math.floor(ms / 3600000), m: Math.floor((ms % 3600000) / 60000) };
}
