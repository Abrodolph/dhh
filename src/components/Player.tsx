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

export default function Player({ clipUrl, unlocked, revealed }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  const limit = revealed ? TOTAL : unlocked;

  useEffect(() => {
    const audio = new Audio(clipUrl);
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      cancelAnimationFrame(rafRef.current);
      audio.pause();
      audioRef.current = null;
    };
  }, [clipUrl]);

  function stop() {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setPosition(0);
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
    a.currentTime = 0;
    void a.play().then(() => {
      setPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    });
  }

  return (
    <div className="w-full">
      {/* Mixtape strip: 5 segments sized proportionally to 1/2/4/8/16s */}
      <div
        className="flex h-10 w-full gap-[3px] rounded-sm overflow-hidden"
        aria-hidden
      >
        {DURATIONS.map((d, i) => {
          const segStart = i === 0 ? 0 : DURATIONS[i - 1];
          const segLen = d - segStart;
          const isUnlocked = d <= limit;
          const fill = Math.min(Math.max(position - segStart, 0), segLen) / segLen;
          return (
            <div
              key={d}
              className={`relative h-full ${
                isUnlocked ? "bg-paper/15" : "bg-paper/5"
              }`}
              style={{ flexGrow: segLen }}
            >
              {isUnlocked && (
                <div
                  className="absolute inset-y-0 left-0 bg-sindoor transition-[width] duration-75"
                  style={{ width: `${fill * 100}%` }}
                />
              )}
              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-smoke select-none">
                  ▮▮
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex justify-between text-xs text-smoke tabular-nums">
        <span>{position.toFixed(1)}s</span>
        <span>
          {limit}s unlocked{revealed ? "" : ` / ${TOTAL}s`}
        </span>
      </div>

      <button
        onClick={playing ? stop : play}
        className="mt-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-paper/30 text-2xl hover:border-amber hover:text-amber transition-colors"
        aria-label={playing ? "Stop" : "Play"}
      >
        {playing ? "■" : "▶"}
      </button>
    </div>
  );
}
