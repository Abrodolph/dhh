export type Difficulty = "easy" | "medium" | "hard" | "mixed";

export type PracticePrefs = {
  artists: string[]; // empty = all artists
  difficulty: Difficulty;
};

export const DIFFICULTY_TO_NUM: Record<Difficulty, number | null> = {
  easy: 1,
  medium: 2,
  hard: 3,
  mixed: null,
};

const KEY = "hook_practice_prefs:v1";
const defaults: PracticePrefs = { artists: [], difficulty: "mixed" };

export function loadPracticePrefs(): PracticePrefs {
  if (typeof window === "undefined") return { ...defaults };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const p = JSON.parse(raw) as Partial<PracticePrefs>;
    return {
      artists: Array.isArray(p.artists) ? p.artists : [],
      difficulty: p.difficulty ?? "mixed",
    };
  } catch {
    return { ...defaults };
  }
}

export function savePracticePrefs(p: PracticePrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}
