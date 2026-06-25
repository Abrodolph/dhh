"use client";

import { useCallback, useEffect, useState } from "react";
import Player from "@/components/Player";
import GuessInput from "@/components/GuessInput";
import AttemptRow from "@/components/AttemptRow";
import ResultCard from "@/components/ResultCard";
import {
  DURATIONS,
  MAX_ATTEMPTS,
  type AttemptResult,
  type GameStatus,
  type GuessResponse,
  type Puzzle,
  type SongOption,
} from "@/lib/types";
import { loadGame, recordDailyResult, saveGame } from "@/lib/storage";

type Mode = "daily" | "random";

export default function Home() {
  const [mode, setMode] = useState<Mode>("daily");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [songs, setSongs] = useState<SongOption[]>([]);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [answer, setAnswer] = useState<{ title: string; artist: string; album: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const attemptNo = attempts.length + 1;
  const unlocked = DURATIONS[Math.min(attempts.length, MAX_ATTEMPTS - 1)];

  const loadPuzzle = useCallback(async (m: Mode) => {
    setError(null);
    setPuzzle(null);
    setAttempts([]);
    setStatus("playing");
    setAnswer(null);
    try {
      const res = await fetch(`/api/puzzle?mode=${m}`);
      if (!res.ok) throw new Error();
      const p = (await res.json()) as Puzzle;
      setPuzzle(p);
      // restore in-progress / finished daily game
      if (m === "daily") {
        const date = p.puzzleId.slice(6);
        const saved = loadGame(date);
        if (saved) {
          setAttempts(saved.attempts as AttemptResult[]);
          setStatus(saved.status);
          if (saved.answer) setAnswer(saved.answer);
        }
      }
    } catch {
      setError("Couldn't load today's puzzle. Database empty or env vars missing?");
    }
  }, []);

  useEffect(() => {
    void loadPuzzle(mode);
  }, [mode, loadPuzzle]);

  useEffect(() => {
    fetch("/api/songs")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setSongs(d))
      .catch(() => {});
  }, []);

  async function submit(song: SongOption | null) {
    if (!puzzle || status !== "playing" || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId: puzzle.puzzleId,
          songId: song?.id ?? null,
          attempt: attemptNo,
        }),
      });
      if (!res.ok) throw new Error();
      const out = (await res.json()) as GuessResponse;

      const result: AttemptResult = !song
        ? { kind: "skip" }
        : out.correct
          ? { kind: "correct", title: song.title, artist: song.artist }
          : { kind: "wrong", title: song.title, artist: song.artist, artistMatch: out.artistMatch };

      const nextAttempts = [...attempts, result];
      const nextStatus: GameStatus = out.correct
        ? "won"
        : nextAttempts.length >= MAX_ATTEMPTS
          ? "lost"
          : "playing";

      setAttempts(nextAttempts);
      setStatus(nextStatus);
      if (out.answer) setAnswer(out.answer);

      if (mode === "daily") {
        const date = puzzle.puzzleId.slice(6);
        saveGame({ date, attempts: nextAttempts, status: nextStatus, answer: out.answer });
        if (nextStatus !== "playing") {
          recordDailyResult(date, out.correct ? nextAttempts.length : null);
        }
      }
    } catch {
      setError("Guess didn't go through — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const gameOver = status !== "playing";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-16 pt-8">
      <header className="text-center">
        <h1 className="font-display text-5xl text-paper">पहचान</h1>
        <p className="mt-1 text-sm text-smoke">
          Guess the track from 1 second. {MAX_ATTEMPTS} attempts.
        </p>
        <div className="mt-4 flex justify-center gap-2 text-xs">
          {(["daily", "random"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-sm border px-3 py-1.5 ${
                mode === m
                  ? "border-amber text-amber"
                  : "border-paper/15 text-smoke hover:text-paper"
              }`}
            >
              {m === "daily"
                ? `Daily${puzzle?.puzzleNumber ? ` #${puzzle.puzzleNumber}` : ""}`
                : "Practice"}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <p className="mt-8 rounded-sm border border-sindoor/40 bg-sindoor/10 p-3 text-sm text-sindoor">
          {error}
        </p>
      )}

      {puzzle && (
        <>
          <section className="mt-8">
            <Player clipUrl={puzzle.clipUrl} unlocked={unlocked} revealed={gameOver} />
          </section>

          <section className="mt-8 flex flex-col gap-2">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
              <AttemptRow key={i} index={i} result={attempts[i] ?? null} />
            ))}
          </section>

          <section className="mt-6">
            {!gameOver ? (
              <GuessInput
                songs={songs}
                disabled={submitting}
                onGuess={(s) => void submit(s)}
                onSkip={() => void submit(null)}
                skipLabel={
                  attemptNo >= MAX_ATTEMPTS
                    ? "Skip (reveals answer)"
                    : `Skip (+${DURATIONS[attempts.length + 1] - unlocked}s unlocked)`
                }
              />
            ) : (
              answer && (
                <div className="flex flex-col gap-3">
                  <ResultCard
                    status={status as "won" | "lost"}
                    answer={answer}
                    attempts={attempts}
                    puzzleNumber={puzzle.puzzleNumber}
                  />
                  {mode === "random" && (
                    <button
                      onClick={() => void loadPuzzle("random")}
                      className="rounded-sm border border-paper/25 py-2.5 text-paper hover:border-amber hover:text-amber"
                    >
                      Ek aur →
                    </button>
                  )}
                </div>
              )
            )}
          </section>
        </>
      )}

      {!puzzle && !error && (
        <p className="mt-16 text-center text-smoke animate-pulse">Loading…</p>
      )}

      <footer className="mt-auto pt-12 text-center text-xs text-smoke/60">
        A fan project. All music belongs to the artists & labels — go stream the full songs.
      </footer>
    </main>
  );
}
