// Round scoring. Shared shape between the server (authoritative recompute in
// /api/score) and the client (labels + preview). The ordering the formula
// guarantees, in priority order:
//   1. a correct guess always beats a wrong/never-guessed one (0 points)
//   2. among correct guesses, fewer seconds of audio (earlier attempt) wins
//   3. only when speed ties does a harder song win (difficulty multiplier)
//
// The multiplier is capped so it can NEVER overturn a speed difference: the
// tightest speed gap is 100 vs 80 (25% apart), and max multiplier is 1.2,
// so 80 * 1.2 = 96 < 100 — a 1s-easy guess still beats a 2s-hard one.

/** Points by attempt index (0 = guessed on the 1s clip … 4 = on the 16s clip). */
export const SPEED_POINTS = [100, 80, 60, 40, 20] as const;

/** Difficulty multiplier keyed by the numeric `difficulty` column (1/2/3). */
export const DIFFICULTY_MULTIPLIER: Record<number, number> = {
  1: 1.0, // easy
  2: 1.1, // medium
  3: 1.2, // hard
};

/** Songs per round. Fixed at 3 for v1. */
export const ROUND_SIZE = 3;

/**
 * Points for a single song.
 * @param correct   whether the song was guessed correctly at all
 * @param attempt   1-indexed attempt of the correct guess (ignored if wrong)
 * @param difficulty numeric difficulty from the DB (1/2/3)
 */
export function songScore(correct: boolean, attempt: number, difficulty: number): number {
  if (!correct) return 0;
  const idx = Math.min(Math.max(attempt, 1), SPEED_POINTS.length) - 1;
  const base = SPEED_POINTS[idx];
  const mult = DIFFICULTY_MULTIPLIER[difficulty] ?? 1.0;
  return Math.round(base * mult);
}

export type ScoreBreakdownItem = {
  correct: boolean;
  attempt: number;
  difficulty: number;
  points: number;
};

/** Round total + per-song breakdown from verified results. */
export function roundScore(
  items: { correct: boolean; attempt: number; difficulty: number }[],
): { total: number; songsCorrect: number; breakdown: ScoreBreakdownItem[] } {
  const breakdown = items.map((it) => ({
    correct: it.correct,
    attempt: it.attempt,
    difficulty: it.difficulty,
    points: songScore(it.correct, it.attempt, it.difficulty),
  }));
  return {
    total: breakdown.reduce((s, b) => s + b.points, 0),
    songsCorrect: breakdown.filter((b) => b.correct).length,
    breakdown,
  };
}
