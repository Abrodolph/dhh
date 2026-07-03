"use client";

import type { AttemptResult, RoundSongResult, ScoreResult } from "@/lib/types";
import { artistLabel } from "@/lib/artists";
import UsernameField from "./UsernameField";

type Props = {
  results: RoundSongResult[];
  result: ScoreResult | null; // null while the score is being computed
  newBest: boolean;
  best: number;
  hasUsername: boolean;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
  onNameSaved: () => void;
};

const DIFF_LABEL: Record<number, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };

function emojiGrid(attempts: AttemptResult[]): string {
  const cells: string[] = attempts.map((a) =>
    a.kind === "correct" ? "✅" : a.kind === "skip" ? "🔇" : a.artistMatch ? "🟨" : "🟥",
  );
  while (cells.length < 5) cells.push("⬜");
  return cells.join("");
}

export default function RoundResultCard({
  results,
  result,
  newBest,
  best,
  hasUsername,
  onPlayAgain,
  onViewLeaderboard,
  onNameSaved,
}: Props) {
  return (
    <div className="rounded-sm border border-paper/20 bg-paper/5 p-5 text-center">
      <p className="font-condensed text-xs uppercase tracking-wider text-smoke">Round complete</p>

      {result ? (
        <>
          <div className="mt-1 font-condensed text-5xl font-bold tabular-nums text-accent">
            {result.score.toLocaleString()}
          </div>
          <p className="text-sm text-smoke">
            {result.songsCorrect} / {result.songsTotal} correct
            {newBest ? " · new best! 🔥" : best ? ` · best ${best.toLocaleString()}` : ""}
          </p>
        </>
      ) : (
        <div className="mt-2 animate-pulse text-smoke">Scoring…</div>
      )}

      <div className="mt-5 flex flex-col gap-2 text-left">
        {results.map((r, i) => {
          const b = result?.breakdown[i];
          return (
            <div
              key={r.puzzleId}
              className="flex items-center justify-between gap-3 rounded-sm border border-paper/10 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                {r.answer.coverUrl && (
                  <div
                    aria-hidden
                    className="h-9 w-9 shrink-0 rounded-sm bg-cover bg-center"
                    style={{ backgroundImage: `url(${r.answer.coverUrl})` }}
                  />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm text-paper">{r.answer.title}</div>
                  <div className="truncate text-xs text-smoke">
                    {artistLabel(r.answer.artist)}
                    {b ? ` · ${DIFF_LABEL[b.difficulty] ?? ""}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm tracking-widest" aria-hidden>
                  {emojiGrid(r.attempts)}
                </span>
                <span className="w-12 text-right font-condensed text-sm tabular-nums text-accent">
                  {b ? `+${b.points}` : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {!hasUsername && (
        <div className="mt-5">
          <p className="mb-2 text-xs text-smoke">Add a name to show on the leaderboard</p>
          <UsernameField onSaved={onNameSaved} startEditing />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={onViewLeaderboard}
          className="min-h-[52px] rounded-sm bg-accent px-6 py-3.5 text-base font-medium text-ink hover:opacity-90"
        >
          View leaderboard
        </button>
        <button
          onClick={onPlayAgain}
          className="min-h-[52px] rounded-sm border border-paper/25 px-6 py-3.5 text-base text-paper hover:border-accent hover:text-accent"
        >
          Play again
        </button>
      </div>
    </div>
  );
}
