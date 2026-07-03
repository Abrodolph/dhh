import type { Puzzle, RoundSongResult } from "./types";

/** In-flight round, held in React state. */
export type RoundState = {
  puzzles: Puzzle[];
  index: number; // which song is active (0-based)
  results: RoundSongResult[]; // completed songs so far
  startedAt: number; // Date.now() at round start, for seconds_used
};

const BEST_KEY = "pehchaan:round-best:v1"; // best score for a length-3 round

export function loadRoundBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Store a new best if higher. Returns true when it beat the previous best. */
export function saveRoundBest(score: number): boolean {
  const prev = loadRoundBest();
  if (score <= prev) return false;
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {}
  return true;
}
