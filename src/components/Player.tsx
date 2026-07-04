"use client";

import { useEffect, useRef, useState } from "react";
import { DURATIONS } from "@/lib/types";

type Props = {
  clipUrl: string;
  /** seconds the player is allowed to hear right now */
  unlocked: number;
  /** when true (game over), the full clip is playable */
  revealed: boolean;
};

const TOTAL = DURATIONS[DURATIONS.length - 1]; // 16

// --- Cassette geometry (SVG user units, viewBox 340×210) ---
const CH_X0 = 44; // exposed-tape strip: left edge
const CH_W = 252; //                     width == the full 16s
const CH_Y = 176; //                     top edge
const CH_H = 14; //                      height
const REEL_L = 118; // supply reel centre x
const REEL_R = 222; // take-up reel centre x
const REEL_CY = 118; // reel centre y
const REEL_R_MAX = 37; // outer wound radius
const REEL_HUB = 14; // hub radius
const SHADOW = "#0E0B2A"; // near-black outline + hard offset shadow
const TAPE = "#17123A"; // dark magnetic tape
const xForT = (t: number) => CH_X0 + (t / TOTAL) * CH_W;

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
  // point already heard (so the tape stays wound to that point when idle).
  const head = playing ? position : restPos;

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
    // play() MUST be called synchronously in the tap's call stack — iOS Safari
    // rejects playback started from a later async callback (e.g. waiting for
    // loadedmetadata). The promise itself resolving after buffering is fine.
    if (a.readyState >= 1) a.currentTime = 0; // reset replays; a fresh clip is at 0 anyway
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
  }

  // Tape wound onto the take-up reel (0→1), shared by both reels + the strip.
  const p = Math.max(0, Math.min(1, head / TOTAL));
  const supplyWound = REEL_HUB + (1 - p) * (REEL_R_MAX - REEL_HUB); // left, empties
  const takeupWound = REEL_HUB + p * (REEL_R_MAX - REEL_HUB); //       right, fills
  const heardW = (Math.min(head, limit) / TOTAL) * CH_W;
  const unlockedW = (limit / TOTAL) * CH_W;

  // One reel: a wound ring of dark tape + a hub that spins only while playing.
  const reel = (cx: number, woundR: number) => (
    <g transform={`translate(${cx} ${REEL_CY})`}>
      <circle r={REEL_R_MAX + 1} fill="none" stroke={SHADOW} strokeOpacity={0.4} strokeWidth={2} />
      {woundR > REEL_HUB + 0.5 && (
        <circle
          r={(REEL_HUB + woundR) / 2}
          fill="none"
          stroke={TAPE}
          strokeWidth={woundR - REEL_HUB}
        />
      )}
      <circle r={woundR} fill="none" stroke="#FF3DA5" strokeOpacity={0.55} strokeWidth={1.5} />
      <g
        className={playing ? "reel-run" : undefined}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <circle r={REEL_HUB} fill="#F4EEDD" stroke={SHADOW} strokeWidth={2} />
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const a = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={Math.cos(a) * 4}
              y1={Math.sin(a) * 4}
              x2={Math.cos(a) * (REEL_HUB - 2)}
              y2={Math.sin(a) * (REEL_HUB - 2)}
              stroke={SHADOW}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
        <circle r={2.5} fill={SHADOW} />
      </g>
    </g>
  );

  return (
    <div className="w-full">
      {/* The visualization IS a stylized cassette: two reels wind as audio plays,
          and the exposed tape along the bottom is the proportional strip —
          bright = heard, dim = unlocked, dark = still locked. Tier ticks mark
          the 1/2/4/8s unlock boundaries. */}
      <svg
        viewBox="0 0 340 212"
        className="mx-auto block w-full max-w-[280px]"
        role="img"
        aria-label={`Cassette: ${head.toFixed(1)} of ${limit} unlocked seconds heard`}
      >
        <defs>
          <linearGradient id="riso" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FF6A1A" />
            <stop offset="0.5" stopColor="#FF3DA5" />
            <stop offset="1" stopColor="#12C2E9" />
          </linearGradient>
          <pattern id="halftone" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.3" fill="#12C2E9" opacity="0.13" />
          </pattern>
        </defs>

        {/* Hard offset shadow, then the shell + halftone screen. */}
        <rect x={12} y={12} width={322} height={192} rx={16} fill={SHADOW} />
        <rect x={6} y={6} width={322} height={192} rx={16} fill="#2A2668" stroke={SHADOW} strokeWidth={4} />
        <rect x={6} y={6} width={322} height={192} rx={16} fill="url(#halftone)" />

        {/* Label strip. */}
        <rect x={26} y={22} width={288} height={38} rx={6} fill="#1C1948" stroke={SHADOW} strokeWidth={2} />
        <text
          x={40}
          y={46}
          fontFamily="var(--font-mono), monospace"
          fontSize={15}
          fill="#F4EEDD"
          letterSpacing={3}
        >
          SIDE A
        </text>
        <rect x={240} y={31} width={60} height={20} rx={3} fill="url(#riso)" stroke={SHADOW} strokeWidth={2} />

        {/* Reel window + threaded tape down to the exposed strip. */}
        <rect x={72} y={REEL_CY - 46} width={196} height={92} rx={12} fill={TAPE} fillOpacity={0.5} stroke={SHADOW} strokeWidth={2} />
        <line x1={REEL_L} y1={REEL_CY + REEL_R_MAX} x2={CH_X0 + 8} y2={CH_Y} stroke={TAPE} strokeWidth={5} />
        <line x1={REEL_R} y1={REEL_CY + REEL_R_MAX} x2={CH_X0 + CH_W - 8} y2={CH_Y} stroke={TAPE} strokeWidth={5} />
        {reel(REEL_L, supplyWound)}
        {reel(REEL_R, takeupWound)}

        {/* Exposed tape = the proportional strip. */}
        <rect x={CH_X0} y={CH_Y} width={CH_W} height={CH_H} rx={7} fill={TAPE} stroke={SHADOW} strokeWidth={2} />
        <rect x={CH_X0} y={CH_Y} width={unlockedW} height={CH_H} rx={7} fill="url(#riso)" opacity={0.32} />
        {heardW > 1 && (
          <rect x={CH_X0} y={CH_Y} width={heardW} height={CH_H} rx={7} fill="url(#riso)" />
        )}
        {[1, 2, 4, 8].map((d) => (
          <line
            key={d}
            x1={xForT(d)}
            x2={xForT(d)}
            y1={CH_Y - 3}
            y2={CH_Y + CH_H + 3}
            stroke={SHADOW}
            strokeWidth={2.5}
            strokeOpacity={d <= limit ? 0.9 : 0.35}
          />
        ))}
        {playing && (
          <g>
            <line x1={xForT(head)} x2={xForT(head)} y1={CH_Y - 6} y2={CH_Y + CH_H + 6} stroke="#12C2E9" strokeWidth={2} />
            <circle cx={xForT(head)} cy={CH_Y - 7} r={3.5} fill="#12C2E9" stroke={SHADOW} strokeWidth={1} />
          </g>
        )}
      </svg>

      {/* Tape-counter readout */}
      <div className="mt-2 flex justify-between font-mono text-xs uppercase tracking-wider text-smoke tabular-nums">
        <span>{head.toFixed(1)}s</span>
        <span>
          {limit}s unlocked{revealed ? "" : ` / ${TOTAL}`}
        </span>
      </div>

      {/* Chunky deck button: thick black outline + hard printed shadow. */}
      <button
        onClick={playing ? stop : play}
        className={`mt-3 mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-night bg-accent text-night text-2xl shadow-[3px_3px_0_#0E0B2A] transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[4px_5px_0_#0E0B2A] active:translate-y-0 active:shadow-[2px_2px_0_#0E0B2A]${
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
