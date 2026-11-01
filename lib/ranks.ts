// Ranked ladder, League-style. Your rank comes from XP; every topic also has its own mastery rank,
// and a topic counts as conquered from Oro up. Pure functions shared by the server and the client.

export type Tier = { id: string; name: string; color: string; glow: string; min: number; divisions: boolean };

export const TIERS: Tier[] = [
  { id: "hierro", name: "Hierro", color: "#7b7f8a", glow: "#a8adb9", min: 0, divisions: true },
  { id: "bronce", name: "Bronce", color: "#b0703c", glow: "#e0a06a", min: 300, divisions: true },
  { id: "plata", name: "Plata", color: "#b9c2d0", glow: "#e6ecf7", min: 800, divisions: true },
  { id: "oro", name: "Oro", color: "#e0b84a", glow: "#ffe08a", min: 1500, divisions: true },
  { id: "platino", name: "Platino", color: "#3fb7b0", glow: "#7ff0e8", min: 2500, divisions: true },
  { id: "esmeralda", name: "Esmeralda", color: "#2fbf71", glow: "#7dffb2", min: 3800, divisions: true },
  { id: "diamante", name: "Diamante", color: "#5b8cff", glow: "#a6c1ff", min: 5500, divisions: true },
  { id: "maestro", name: "Maestro", color: "#b05cf0", glow: "#d9a2ff", min: 7800, divisions: false },
  { id: "gran-maestro", name: "Gran Maestro", color: "#e8485f", glow: "#ff9aa8", min: 10500, divisions: false },
  { id: "retador", name: "Retador", color: "#f4d27a", glow: "#7ff0ff", min: 14000, divisions: false },
];

const ROMAN = ["", "I", "II", "III", "IV"];

export type Rank = {
  tier: Tier;
  tierIndex: number;
  division: number | null; // 4 (lowest) to 1 (highest); null above Diamante
  label: string; // "Plata II"
  xp: number;
  into: number; // XP gained inside the current division
  need: number; // XP the division spans
  lp: number; // 0..99, like League points
  pct: number;
  nextLabel: string | null;
  toNext: number;
};

export function rankFromXp(xp: number): Rank {
  let tierIndex = 0;
  while (tierIndex + 1 < TIERS.length && xp >= TIERS[tierIndex + 1].min) tierIndex += 1;
  const tier = TIERS[tierIndex];
  const nextTier = TIERS[tierIndex + 1];
  const span = nextTier ? nextTier.min - tier.min : 3000;
  let division: number | null = null;
  let into = xp - tier.min;
  let need = span;
  if (tier.divisions) {
    const size = span / 4;
    const d = Math.min(3, Math.floor((xp - tier.min) / size));
    division = 4 - d;
    into = xp - tier.min - d * size;
    need = size;
  } else if (!nextTier) {
    need = 3000;
    into = (xp - tier.min) % need;
  }
  const label = division ? `${tier.name} ${ROMAN[division]}` : tier.name;
  let nextLabel: string | null = null;
  if (division && division > 1) nextLabel = `${tier.name} ${ROMAN[division - 1]}`;
  else if (nextTier) nextLabel = nextTier.divisions ? `${nextTier.name} IV` : nextTier.name;
  const pct = Math.min(100, Math.round((into / need) * 100));
  return {
    tier,
    tierIndex,
    division,
    label,
    xp,
    into: Math.round(into),
    need: Math.round(need),
    lp: Math.min(99, pct),
    pct,
    nextLabel,
    toNext: Math.max(0, Math.round(need - into)),
  };
}

// ---------- Topic conquest ----------
const TOPIC_MIN = [0, 8, 22, 45, 80, 125, 185, 260];
export const CONQUER_TIER = 3; // Oro

export type Mastery = { tier: Tier; tierIndex: number; points: number; pct: number; nextName: string | null; conquered: boolean };

// Mastery points: correct answers, weighted by accuracy, so guessing does not climb.
export function topicMastery(correct: number, answered: number): Mastery {
  const accuracy = answered ? correct / answered : 0;
  const points = Math.round(correct * accuracy * 10) / 10;
  let tierIndex = 0;
  while (tierIndex + 1 < TOPIC_MIN.length && points >= TOPIC_MIN[tierIndex + 1]) tierIndex += 1;
  const next = TOPIC_MIN[tierIndex + 1];
  const pct = next === undefined ? 100 : Math.round(((points - TOPIC_MIN[tierIndex]) / (next - TOPIC_MIN[tierIndex])) * 100);
  return {
    tier: TIERS[tierIndex],
    tierIndex,
    points,
    pct: Math.max(0, Math.min(100, pct)),
    nextName: next === undefined ? null : TIERS[tierIndex + 1].name,
    conquered: tierIndex >= CONQUER_TIER,
  };
}

// Grade of one quiz, like the post-game letter.
export function gradeFor(pct: number): { letter: string; color: string } {
  if (pct >= 100) return { letter: "S+", color: "#f4d27a" };
  if (pct >= 90) return { letter: "S", color: "#f0d89a" };
  if (pct >= 80) return { letter: "A", color: "#2fd68f" };
  if (pct >= 65) return { letter: "B", color: "#0ac8b9" };
  if (pct >= 50) return { letter: "C", color: "#5b8cff" };
  return { letter: "D", color: "#e8485f" };
}
