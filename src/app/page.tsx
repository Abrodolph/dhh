"use client";

import { useCallback, useEffect, useState } from "react";
import Player from "@/components/Player";
import GuessInput from "@/components/GuessInput";
import AttemptRow from "@/components/AttemptRow";
import ResultCard from "@/components/ResultCard";
import CollageBackground from "@/components/CollageBackground";
import StatsModal from "@/components/StatsModal";
import Countdown from "@/components/Countdown";
import PracticeFilters from "@/components/PracticeFilters";
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
import { getPlayerId } from "@/lib/identity";
import {
  loadPracticePrefs,
  savePracticePrefs,
  DIFFICULTY_TO_NUM,
  type PracticePrefs,
} from "@/lib/practicePrefs";

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
  const [statsOpen, setStatsOpen] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [artists, setArtists] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<PracticePrefs>({ artists: [], difficulty: "mixed" });

  const attemptNo = attempts.length + 1;
  const unlocked = DURATIONS[Math.min(attempts.length, MAX_ATTEMPTS - 1)];

  const loadPuzzle = useCallback(async (m: Mode, prefsOverride?: PracticePrefs) => {
    setError(null);
    setEmpty(false);
    setPuzzle(null);
    setAttempts([]);
    setStatus("playing");
    setAnswer(null);
    try {
      // Daily: unchanged global endpoint / shared puzzle-fetch.
      // Practice: separate filtered endpoint, no daily-pick involvement.
      let url = "/api/puzzle?mode=daily";
      if (m === "random") {
        const p = prefsOverride ?? loadPracticePrefs();
        const qs = new URLSearchParams();
        if (p.artists.length) qs.set("artists", p.artists.join(","));
        if (p.difficulty !== "mixed") qs.set("difficulty", String(DIFFICULTY_TO_NUM[p.difficulty]));
        url = `/api/practice${qs.toString() ? `?${qs.toString()}` : ""}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Puzzle & { empty?: boolean };

      if (m === "random" && data.empty) {
        setEmpty(true);
        return;
      }

      setPuzzle(data);
      // restore in-progress / finished daily game
      if (m === "daily") {
        const date = data.puzzleId.slice(6);
        const saved = loadGame(date);
        if (saved) {
          setAttempts(saved.attempts as AttemptResult[]);
          setStatus(saved.status);
          if (saved.answer) setAnswer(saved.answer);
        }
      }
    } catch {
      setError("Couldn't load the puzzle. Database empty or env vars missing?");
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

  useEffect(() => {
    setPrefs(loadPracticePrefs());
  }, []);

  useEffect(() => {
    fetch("/api/artists")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setArtists(d))
      .catch(() => {});
  }, []);

  // Register an anonymous player id once per session (fire-and-forget;
  // never blocks gameplay).
  useEffect(() => {
    const id = getPlayerId();
    if (!id) return;
    try {
      if (sessionStorage.getItem("hook_player_synced")) return;
      sessionStorage.setItem("hook_player_synced", "1");
    } catch {}
    fetch("/api/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
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

  function updatePrefs(p: PracticePrefs) {
    setPrefs(p);
    savePracticePrefs(p);
  }

  const gameOver = status !== "playing";

  return (
    <>
      <CollageBackground strength={0.14} />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col bg-ink/85 px-5 pb-16 pt-8 shadow-2xl shadow-black/50 backdrop-blur-sm md:border-x md:border-paper/10">
      <button
        onClick={() => setStatsOpen(true)}
        className="absolute right-4 top-4 min-h-[40px] rounded-sm border border-paper/15 px-3.5 py-2 font-condensed text-sm uppercase tracking-wider text-smoke hover:border-accent hover:text-accent"
      >
        Stats
      </button>
      <header className="text-center">
        <h1 className="font-condensed text-5xl font-bold uppercase tracking-tight text-paper">DHH Heardle</h1>
        <p className="mt-1 font-condensed text-sm uppercase tracking-wide text-smoke">
          Guess the track from 1 second. {MAX_ATTEMPTS} attempts.
        </p>
        <div className="mt-4 flex justify-center gap-2 text-xs">
          {(["daily", "random"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`min-h-[52px] rounded-sm border px-6 py-3.5 text-base font-condensed uppercase tracking-wider ${
                mode === m
                  ? "border-accent text-accent"
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

      {mode === "random" && (
        <section className="mt-8">
          <PracticeFilters artists={artists} prefs={prefs} onChange={updatePrefs} />
          <button
            onClick={() => void loadPuzzle("random", prefs)}
            className="mt-3 min-h-[58px] w-full rounded-sm border border-accent py-4 text-lg font-condensed uppercase tracking-wider text-accent hover:bg-accent/10"
          >
            New puzzle
          </button>
        </section>
      )}

      {empty && mode === "random" && (
        <p className="mt-8 rounded-sm border border-amber/40 bg-amber/10 p-3 text-center text-sm text-amber">
          No songs match — try widening your picks.
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
                  {mode === "daily" && <Countdown />}
                </div>
              )
            )}
          </section>
        </>
      )}

      {!puzzle && !empty && !error && (
        <p className="mt-16 text-center text-smoke animate-pulse">Loading…</p>
      )}

      <footer className="mt-auto pt-12 text-center text-xs text-smoke/60">
        A fan project. All music belongs to the artists & labels — go stream the full songs.
      </footer>
      </main>
      <StatsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
    </>
  );
}
