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

/** The song, revealed only when the game ends (correct or out of attempts).
 * `coverUrl` is gated the same way — it never reaches the client mid-game. */
export type RevealAnswer = {
  title: string;
  artist: string;
  album: string | null;
  coverUrl?: string | null;
};

export type GuessResponse = {
  correct: boolean;
  artistMatch: boolean;
  answer?: RevealAnswer;
  /** Signed proof, present only when `correct`. Binds songId + attempt so the
   * round score can't be forged when submitted to /api/score. */
  proof?: string;
};

// ---- Round mode ---------------------------------------------------------

/** One song's outcome within a round, kept client-side and posted to /api/score. */
export type RoundSongResult = {
  puzzleId: string;
  attempt: number; // 1-indexed correct attempt, or MAX_ATTEMPTS if never got it
  correct: boolean;
  proof: string | null; // signed win proof from /api/guess (null if wrong)
  answer: RevealAnswer;
  attempts: AttemptResult[]; // for the emoji grid
};

/** What /api/score returns after verifying + recomputing the round. */
export type ScoreResult = {
  score: number;
  songsCorrect: number;
  songsTotal: number;
  breakdown: { correct: boolean; attempt: number; difficulty: number; points: number }[];
};

export type LeaderboardEntry = {
  rank: number;
  playerId: string;
  username: string | null;
  score: number;
  songsCorrect: number;
  secondsUsed: number;
  createdAt: string;
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
