"use client";

import { useMemo, useRef, useState } from "react";
import type { SongOption } from "@/lib/types";

type Props = {
  songs: SongOption[];
  disabled: boolean;
  onGuess: (song: SongOption) => void;
  onSkip: () => void;
  skipLabel: string;
};

/** Simple subsequence + substring scorer; good enough for <500 titles. */
function score(q: string, s: string): number {
  const query = q.toLowerCase();
  const text = s.toLowerCase();
  if (text === query) return 100;
  if (text.startsWith(query)) return 80;
  if (text.includes(query)) return 60;
  // subsequence match
  let qi = 0;
  for (const ch of text) if (ch === query[qi]) qi++;
  return qi === query.length ? 30 : 0;
}

export default function GuessInput({ songs, disabled, onGuess, onSkip, skipLabel }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    if (q.trim().length < 1) return [];
    return songs
      .map((s) => ({ s, sc: score(q, `${s.title} ${s.artist}`) }))
      .filter((x) => x.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 8)
      .map((x) => x.s);
  }, [q, songs]);

  function choose(song: SongOption) {
    setQ("");
    setOpen(false);
    onGuess(song);
  }

  return (
    <div className="w-full">
      <div className="relative">
        <input
          ref={inputRef}
          value={q}
          disabled={disabled}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={(e) => {
            if (!open || matches.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(matches[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Which song is it? Type to search…"
          className="w-full rounded-sm border border-accent bg-ink px-4 py-3 text-paper placeholder-smoke focus:border-accent focus:shadow-[0_0_12px_rgba(198,251,69,0.25)] disabled:opacity-40"
          autoComplete="off"
          spellCheck={false}
          aria-label="Guess the song"
        />
        {open && matches.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-sm border border-paper/20 bg-ink shadow-xl max-h-72 overflow-auto">
            {matches.map((m, i) => (
              <li key={m.id}>
                <button
                  className={`w-full px-4 py-2.5 text-left ${
                    i === highlight ? "bg-paper/10" : ""
                  }`}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => choose(m)}
                >
                  <span className="text-paper">{m.title}</span>
                  <span className="ml-2 text-xs text-smoke">{m.artist}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={onSkip}
        disabled={disabled}
        className="mt-3 w-full rounded-sm border border-paper/20 py-2.5 text-sm text-smoke hover:border-smoke hover:text-paper transition-colors disabled:opacity-40"
      >
        {skipLabel}
      </button>
    </div>
  );
}
