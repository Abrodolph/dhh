"use client";

import { useCallback, useEffect, useState } from "react";
import Player from "@/components/Player";
import GuessInput from "@/components/GuessInput";
import AttemptRow from "@/components/AttemptRow";
import ResultCard from "@/components/ResultCard";
import RoundResultCard from "@/components/RoundResultCard";
import CoverBackdrop from "@/components/CoverBackdrop";
import CollageBackground from "@/components/CollageBackground";
import StatsModal from "@/components/StatsModal";
import LeaderboardModal from "@/components/LeaderboardModal";
import Countdown from "@/components/Countdown";
import PracticeFilters from "@/components/PracticeFilters";
import { artistLabel } from "@/lib/artists";
import {
  DURATIONS,
  MAX_ATTEMPTS,
  type AttemptResult,
  type GameStatus,
  type GuessResponse,
  type Puzzle,
  type RevealAnswer,
  type RoundSongResult,
  type ScoreResult,
  type SongOption,
} from "@/lib/types";
import { loadGame, recordDailyResult, saveGame } from "@/lib/storage";
import { getPlayerId, getUsername } from "@/lib/identity";
import { type RoundState, loadRoundBest, saveRoundBest } from "@/lib/round";
import {
  loadPracticePrefs,
  savePracticePrefs,
  DIFFICULTY_TO_NUM,
  type PracticePrefs,
} from "@/lib/practicePrefs";

type Mode = "daily" | "random" | "round";

function emojiGrid(attempts: AttemptResult[]): string {
  const cells: string[] = attempts.map((a) =>
    a.kind === "correct" ? "✅" : a.kind === "skip" ? "🔇" : a.artistMatch ? "🟨" : "🟥",
  );
  while (cells.length < 5) cells.push("⬜");
  return cells.join("");
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("daily");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [songs, setSongs] = useState<SongOption[]>([]);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [answer, setAnswer] = useState<RevealAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [lbOpen, setLbOpen] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [artists, setArtists] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<PracticePrefs>({ artists: [], difficulty: "mixed" });

  // Round mode
  const [round, setRound] = useState<RoundState | null>(null);
  const [roundDone, setRoundDone] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [best, setBest] = useState(0);
  const [hasName, setHasName] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const attemptNo = attempts.length + 1;
  const unlocked = DURATIONS[Math.min(attempts.length, MAX_ATTEMPTS - 1)];

  const loadPuzzle = useCallback(async (m: Exclude<Mode, "round">, prefsOverride?: PracticePrefs) => {
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

  // Load the given puzzle as the "current song" (used by daily/practice and by
  // each song within a round).
  const setCurrentSong = useCallback((p: Puzzle) => {
    setPuzzle(p);
    setAttempts([]);
    setStatus("playing");
    setAnswer(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (mode === "round") {
      // Round is not auto-loaded; wait for "Start round".
      setPuzzle(null);
      setRound(null);
      setRoundDone(false);
      setScoreResult(null);
      setNewBest(false);
      setEmpty(false);
      setError(null);
      return;
    }
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
    setBest(loadRoundBest());
    setHasName(!!getUsername());
    setPlayerId(getPlayerId());
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

      // Round: when a song ends, capture its verified result (incl. win proof).
      if (mode === "round" && round && nextStatus !== "playing") {
        const songResult: RoundSongResult = {
          puzzleId: puzzle.puzzleId,
          attempt: out.correct ? nextAttempts.length : MAX_ATTEMPTS,
          correct: out.correct,
          proof: out.proof ?? null,
          answer: out.answer ?? { title: "—", artist: "", album: null },
          attempts: nextAttempts,
        };
        setRound((r) => (r ? { ...r, results: [...r.results, songResult] } : r));
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

  async function startRound() {
    setError(null);
    setEmpty(false);
    setRoundDone(false);
    setScoreResult(null);
    setNewBest(false);
    setPuzzle(null);
    setRound(null);
    try {
      const qs = new URLSearchParams();
      if (prefs.artists.length) qs.set("artists", prefs.artists.join(","));
      if (prefs.difficulty !== "mixed") qs.set("difficulty", String(DIFFICULTY_TO_NUM[prefs.difficulty]));
      const res = await fetch(`/api/round${qs.toString() ? `?${qs.toString()}` : ""}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { puzzles?: Puzzle[]; empty?: boolean };
      if (data.empty || !data.puzzles || data.puzzles.length === 0) {
        setEmpty(true);
        return;
      }
      setRound({ puzzles: data.puzzles, index: 0, results: [], startedAt: Date.now() });
      setCurrentSong(data.puzzles[0]);
    } catch {
      setError("Couldn't start the round.");
    }
  }

  async function submitRound(r: RoundState) {
    setScoreResult(null);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: getPlayerId(),
          results: r.results.map((x) => ({
            puzzleId: x.puzzleId,
            attempt: x.attempt,
            correct: x.correct,
            proof: x.proof,
          })),
          secondsUsed: Math.round((Date.now() - r.startedAt) / 1000),
          artists: prefs.artists,
          difficulty: prefs.difficulty,
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ScoreResult;
      setScoreResult(data);
      setNewBest(saveRoundBest(data.score));
      setBest(loadRoundBest());
    } catch {
      setError("Couldn't submit your round score.");
    }
  }

  function nextSong() {
    if (!round) return;
    const nextIndex = round.index + 1;
    if (nextIndex < round.puzzles.length) {
      setRound({ ...round, index: nextIndex });
      setCurrentSong(round.puzzles[nextIndex]);
    } else {
      setRoundDone(true);
      void submitRound(round);
    }
  }

  function playAgain() {
    setRoundDone(false);
    setScoreResult(null);
    setNewBest(false);
    setRound(null);
    setPuzzle(null);
    void startRound();
  }

  const gameOver = status !== "playing";
  const inRoundGame = mode === "round" && !!round && !roundDone;
  const showPuzzle = !!puzzle && !(mode === "round" && (roundDone || !round));

  return (
    <>
      <CollageBackground strength={0.1} />
      <main className="card-halftone relative z-10 mx-auto flex min-h-screen max-w-md flex-col bg-ink px-5 pb-12 pt-6 shadow-2xl shadow-black/40 md:border-x-2 md:border-night">
      {/* Racing stripe: the cassette label's signature band, full-bleed across
          the top of the card. */}
      <div aria-hidden className="tape-stripes absolute inset-x-0 top-0 h-2.5" />
      {/* Practice is a secondary mode: reachable but off to the side, not a
          primary center tab like Daily / Compete. */}
      <button
        onClick={() => setMode("random")}
        className={`absolute left-4 top-4 min-h-[40px] rounded-sm border px-3.5 py-2 font-condensed text-sm uppercase tracking-wider ${
          mode === "random"
            ? "border-accent text-accent"
            : "border-paper/15 text-smoke hover:border-accent hover:text-accent"
        }`}
      >
        Practice
      </button>
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          onClick={() => setLbOpen(true)}
          className="min-h-[40px] rounded-sm border border-paper/15 px-3.5 py-2 font-condensed text-sm uppercase tracking-wider text-smoke hover:border-accent hover:text-accent"
        >
          Ranks
        </button>
        <button
          onClick={() => setStatsOpen(true)}
          className="min-h-[40px] rounded-sm border border-paper/15 px-3.5 py-2 font-condensed text-sm uppercase tracking-wider text-smoke hover:border-accent hover:text-accent"
        >
          Stats
        </button>
      </div>
      <header className="text-center">
        <h1 className="mt-8 font-condensed text-4xl font-bold uppercase tracking-tight text-paper">DHH Heardle</h1>
        <p className="mt-1 font-condensed text-sm uppercase tracking-wide text-smoke">
          Guess the track from 1 second. {MAX_ATTEMPTS} attempts.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          {(["daily", "round"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`min-h-[48px] flex-1 rounded-sm border px-4 py-3 text-lg font-condensed uppercase tracking-wider ${
                mode === m
                  ? "border-accent text-accent"
                  : "border-paper/15 text-smoke hover:text-paper"
              }`}
            >
              {m === "daily"
                ? `Daily${puzzle && mode === "daily" && puzzle.puzzleNumber ? ` #${puzzle.puzzleNumber}` : ""}`
                : "Compete"}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <p className="mt-8 rounded-sm border border-sindoor/40 bg-sindoor/10 p-3 text-sm text-sindoor">
          {error}
        </p>
      )}

      {/* Practice setup */}
      {mode === "random" && (
        <section className="mt-8">
          <PracticeFilters artists={artists} prefs={prefs} onChange={updatePrefs} />
          <button
            onClick={() => void loadPuzzle("random", prefs)}
            className="mt-3 min-h-[58px] w-full rounded-sm bg-accent py-4 text-lg font-condensed uppercase tracking-wider text-ink shadow-[3px_3px_0_#0E0B2A] transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[4px_5px_0_#0E0B2A]"
          >
            New puzzle
          </button>
        </section>
      )}

      {/* Compete setup */}
      {mode === "round" && !round && !roundDone && (
        <section className="mt-6">
          <div className="rounded-sm border border-accent/40 bg-accent/5 p-4 text-center">
            <p className="font-condensed text-lg font-bold uppercase tracking-wider text-paper">
              3 songs. One shot.
            </p>
            <p className="mt-1 text-sm text-smoke">
              Climb the <span className="font-bold text-accent">leaderboard</span> — faster
              guesses and harder songs score more.
            </p>
          </div>
          <div className="mt-4">
            <PracticeFilters artists={artists} prefs={prefs} onChange={updatePrefs} />
          </div>
          <button
            onClick={() => void startRound()}
            className="mt-3 min-h-[58px] w-full rounded-sm bg-accent py-4 text-lg font-condensed uppercase tracking-wider text-ink shadow-[3px_3px_0_#0E0B2A] transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[4px_5px_0_#0E0B2A]"
          >
            Start competing
          </button>
        </section>
      )}

      {empty && (mode === "random" || mode === "round") && (
        <p className="mt-8 rounded-sm border border-amber/40 bg-amber/10 p-3 text-center text-sm text-amber">
          {mode === "round"
            ? "Not enough songs match for a round of 3 — widen your picks."
            : "No songs match — try widening your picks."}
        </p>
      )}

      {/* Round result */}
      {mode === "round" && roundDone && (
        <section className="mt-8">
          <RoundResultCard
            results={round?.results ?? []}
            result={scoreResult}
            newBest={newBest}
            best={best}
            hasUsername={hasName}
            onPlayAgain={playAgain}
            onViewLeaderboard={() => setLbOpen(true)}
            onNameSaved={() => setHasName(true)}
          />
        </section>
      )}

      {showPuzzle && puzzle && (
        <>
          {inRoundGame && round && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <span className="font-condensed text-xs uppercase tracking-wider text-smoke">
                Song {round.index + 1} of {round.puzzles.length}
              </span>
              <span className="flex gap-1" aria-hidden>
                {round.puzzles.map((_, i) => {
                  const done = round.results[i];
                  return (
                    <span
                      key={i}
                      className={`h-2 w-2 rounded-full ${
                        done
                          ? done.correct
                            ? "bg-accent"
                            : "bg-sindoor"
                          : i === round.index
                            ? "bg-paper/60"
                            : "bg-paper/20"
                      }`}
                    />
                  );
                })}
              </span>
            </div>
          )}

          <section className={inRoundGame ? "mt-4" : "mt-5"}>
            <Player clipUrl={puzzle.clipUrl} unlocked={unlocked} revealed={gameOver} />
          </section>

          <section className="mt-5 flex flex-col gap-1.5">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
              <AttemptRow key={i} index={i} result={attempts[i] ?? null} />
            ))}
          </section>

          <section className="mt-5">
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
            ) : inRoundGame && round ? (
              answer && (
                <div className="relative overflow-hidden rounded-sm border border-paper/20 bg-paper/5 p-5 text-center">
                  <CoverBackdrop coverUrl={answer.coverUrl} />
                  <div className="relative">
                    <p className="text-sm text-smoke">{status === "won" ? "Nice 🔥" : "Missed it"}</p>
                    <h2 className="mt-1 font-condensed text-2xl font-bold uppercase tracking-wide">{answer.title}</h2>
                    <p className="text-smoke">{artistLabel(answer.artist)}</p>
                    <div className="mt-3 text-xl tracking-widest" aria-hidden>
                      {emojiGrid(attempts)}
                    </div>
                    <button
                      onClick={nextSong}
                      className="mt-5 min-h-[52px] w-full rounded-sm border border-accent py-3.5 text-base font-condensed uppercase tracking-wider text-accent hover:bg-accent/10"
                    >
                      {round.index + 1 < round.puzzles.length ? "Next song →" : "See results →"}
                    </button>
                  </div>
                </div>
              )
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

      {!puzzle && !empty && !error && mode !== "round" && (
        <p className="mt-16 text-center text-smoke animate-pulse">Loading…</p>
      )}

      <footer className="mt-auto pt-8 text-center text-xs text-smoke/60">
        A fan project. All music belongs to the artists & labels — go stream the full songs.
      </footer>
      </main>
      <StatsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
      <LeaderboardModal open={lbOpen} onClose={() => setLbOpen(false)} playerId={playerId} />
    </>
  );
}
