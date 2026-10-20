// Shared by the quiz runner (client) and the results page (server).
export const POINTS_PER_HIT = 100;
export const STREAK_BONUS = 25;
export const MAX_BONUS = 100;

export function pointsFor(streak: number) {
  return POINTS_PER_HIT + Math.min((streak - 1) * STREAK_BONUS, MAX_BONUS);
}

// Points and best streak for a list of answers, in question order.
export function scoreRun(answers: number[], correct: number[]) {
  let points = 0;
  let streak = 0;
  let bestStreak = 0;
  answers.forEach((a, i) => {
    if (a !== -1 && a === correct[i]) {
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
      points += pointsFor(streak);
    } else {
      streak = 0;
    }
  });
  return { points, bestStreak };
}
