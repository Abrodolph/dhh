"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DURATIONS } from "@/lib/types";

type Props = {
  clipUrl: string;
  /** seconds the player is allowed to hear right now */
  unlocked: number;
  /** when true (game over), the full clip is playable */
  revealed: boolean;
};

const TOTAL = DURATIONS[DURATIONS.length - 1]; // 16
const BAR_COUNT = 56;

export default function Player({ clipUrl, unlocked, revealed }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  // How much of the strip stays filled red when idle (i.e. already heard).
  const [restPos, setRestPos] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const limit = revealed ? TOTAL : unlocked;

  // The fill head: the live playhead while playing, otherwise the furthest
  // point already heard (so the bar stays red after playback instead of black).
  const head = playing ? position : restPos;

  // Synthesized waveform silhouette: deterministic bar heights (0.42–0.92) from
  // layered sines, computed once. NOT real audio data — true FFT needs Web Audio
  // analysis, which needs CORS on the R2 media (would break playback).
  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => {
        const v =
          Math.sin(i * 0.7) * 0.5 +
          Math.sin(i * 1.9 + 1.3) * 0.3 +
          Math.sin(i * 0.3 + 0.6) * 0.2;
        return 0.42 + (v * 0.5 + 0.5) * 0.5;
      }),
    [],
  );

  useEffect(() => {
    setAudioError(null);
    // NOTE: do NOT set audio.crossOrigin — the R2 public bucket sends no
    // Access-Control-Allow-Origin header, so requesting CORS would break
    // playback. Plain media playback does not need CORS.
    const audio = new Audio(clipUrl);
    audio.preload = "auto";
    const onError = () => {
      const err = audio.error;
      setAudioError(
        `Audio failed to load (code ${err?.code ?? "?"}). Check the clip URL.`,
      );
      // eslint-disable-next-line no-console
      console.error("[Player] audio load error", clipUrl, err);
    };
    audio.addEventListener("error", onError);
    audio.load();
    audioRef.current = audio;
    return () => {
      cancelAnimationFrame(rafRef.current);
      audio.removeEventListener("error", onError);
      audio.pause();
      audioRef.current = null;
    };
  }, [clipUrl]);

  function stop() {
    const a = audioRef.current;
    if (!a) return;
    // Remember how far we got so the strip stays red up to that point.
    const reached = Math.min(a.currentTime, limit);
    a.pause();
    a.currentTime = 0;
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setPosition(0);
    setRestPos((prev) => Math.max(prev, reached));
  }

  function tick() {
    const a = audioRef.current;
    if (!a) return;
    setPosition(a.currentTime);
    if (a.currentTime >= limit || a.ended) {
      stop();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function play() {
    const a = audioRef.current;
    if (!a) return;
    setAudioError(null);
    const start = () => {
      a.currentTime = 0;
      a.play()
        .then(() => {
          setPlaying(true);
          rafRef.current = requestAnimationFrame(tick);
        })
        .catch((err) => {
          setAudioError(`Playback blocked: ${err?.message ?? err}`);
          // eslint-disable-next-line no-console
          console.error("[Player] play() rejected", err);
          setPlaying(false);
        });
    };
    // If metadata isn't loaded yet, seeking to 0 can be ignored; wait for it.
    if (a.readyState >= 1) start();
    else a.addEventListener("loadedmetadata", start, { once: true });
  }

  return (
    <div className="w-full">
      {/* Live waveform: tall lime bars = heard/playing, dim short = locked.
          Tier ticks mark the 1/2/4/8/16s unlock boundaries. */}
      <div className="relative">
        <div className="flex h-16 w-full items-center gap-[2px]" aria-hidden>
          {bars.map((base, i) => {
            const t = ((i + 0.5) / BAR_COUNT) * TOTAL; // bar's time, 0–16s
            const locked = t > limit;
            const heard = !locked && t <= head;
            const isTip = playing && head >= t && head - t < TOTAL / BAR_COUNT;
            const h = locked ? Math.max(0.12, base * 0.4) : heard ? base : base * 0.7;
            return (
              <div
                key={i}
                className={`min-w-0 flex-1 rounded-full transition-[height,background-color,box-shadow] duration-100 ease-linear ${
                  heard ? "bg-accent" : locked ? "bg-paper/10" : "bg-paper/30"
                } ${isTip ? "shadow-[0_0_10px_rgba(198,251,69,0.7)]" : ""}`}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>
        {DURATIONS.slice(0, -1).map((d) => (
          <span
            key={d}
            aria-hidden
            className={`absolute inset-y-0 w-px ${
              d <= limit ? "bg-accent/40" : "bg-paper/15"
            }`}
            style={{ left: `${(d / TOTAL) * 100}%` }}
          />
        ))}
      </div>

      <div className="mt-2 flex justify-between font-condensed text-xs uppercase tracking-wider text-smoke tabular-nums">
        <span>{head.toFixed(1)}s</span>
        <span>
          {limit}s unlocked{revealed ? "" : ` / ${TOTAL}`}
        </span>
      </div>

      <button
        onClick={playing ? stop : play}
        className={`mt-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent bg-accent text-ink text-2xl shadow-[0_0_14px_rgba(198,251,69,0.4)] hover:shadow-[0_0_24px_rgba(198,251,69,0.65)] transition-[box-shadow,border-color,color]${
          playing ? " play-pulse" : ""
        }`}
        aria-label={playing ? "Stop" : "Play"}
      >
        {playing ? "■" : "▶"}
      </button>

      {audioError && (
        <p className="mt-3 text-center text-xs text-sindoor">{audioError}</p>
      )}
    </div>
  );
}
