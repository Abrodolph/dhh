export const DURATIONS = [1, 2, 4, 8, 16] as const;
export const MAX_ATTEMPTS = DURATIONS.length;

export type SongOption = {
  id: string;
  title: string;
  artist: string;
};

export type Puzzle = {
  puzzleId: string; // opaque: "daily:2026-06-10" or "rand:<token>"
  puzzleNumber: number | null; // daily counter; null in practice mode
  clipUrl: string;
  durations: number[];
};

export type GuessRequest = {
  puzzleId: string;
  songId: string | null; // null = skip
  attempt: number; // 1-indexed
};

export type GuessResponse = {
  correct: boolean;
  artistMatch: boolean;
  answer?: { title: string; artist: string; album: string | null };
};

export type AttemptResult =
  | { kind: "skip" }
  | { kind: "wrong"; title: string; artist: string; artistMatch: boolean }
  | { kind: "correct"; title: string; artist: string };

export type GameStatus = "playing" | "won" | "lost";

export type Stats = {
  played: number;
  won: number;
  streak: number;
  maxStreak: number;
  dist: number[]; // wins by attempt index 0..4
  lastDaily: string | null; // "2026-06-10" of last completed daily
};
