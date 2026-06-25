import type { Stats } from "./types";

const KEY = "pehchaan:stats:v1";

const empty: Stats = {
  played: 0,
  won: 0,
  streak: 0,
  maxStreak: 0,
  dist: [0, 0, 0, 0, 0],
  lastDaily: null,
};

export function loadStats(): Stats {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : { ...empty };
  } catch {
    return { ...empty };
  }
}

export function recordDailyResult(date: string, wonAttempt: number | null): Stats {
  const s = loadStats();
  if (s.lastDaily === date) return s; // already recorded today
  s.played += 1;
  if (wonAttempt !== null) {
    s.won += 1;
    s.dist[wonAttempt - 1] += 1;
    s.streak = isConsecutive(s.lastDaily, date) || s.lastDaily === null ? s.streak + 1 : 1;
    s.maxStreak = Math.max(s.maxStreak, s.streak);
  } else {
    s.streak = 0;
  }
  s.lastDaily = date;
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

function isConsecutive(prev: string | null, cur: string): boolean {
  if (!prev) return false;
  return Date.parse(cur) - Date.parse(prev) === 86_400_000;
}

// Persist in-progress daily game so refresh doesn't reset it.
const GAME_KEY = "pehchaan:daily-game:v1";

export type SavedGame = {
  date: string;
  attempts: unknown[];
  status: "playing" | "won" | "lost";
  answer?: { title: string; artist: string; album: string | null };
};

export function saveGame(g: SavedGame) {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(g));
  } catch {}
}

export function loadGame(date: string): SavedGame | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as SavedGame;
    return g.date === date ? g : null;
  } catch {
    return null;
  }
}
