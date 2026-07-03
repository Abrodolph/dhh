"use client";

import { useState } from "react";
import type { PracticePrefs, Difficulty } from "@/lib/practicePrefs";
import { artistLabel } from "@/lib/artists";

const DIFFICULTIES: { label: string; value: Difficulty }[] = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" },
  { label: "Mixed", value: "mixed" },
];

type Props = {
  artists: string[];
  prefs: PracticePrefs;
  onChange: (p: PracticePrefs) => void;
};

export default function PracticeFilters({ artists, prefs, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const allArtists = prefs.artists.length === 0;

  function toggleArtist(a: string) {
    const set = new Set(prefs.artists);
    set.has(a) ? set.delete(a) : set.add(a);
    onChange({ ...prefs, artists: Array.from(set) });
  }

  const chip = (on: boolean) =>
    `min-h-[38px] rounded-sm border px-3 py-1.5 font-condensed text-xs uppercase tracking-wider transition-colors ${
      on ? "border-accent text-accent" : "border-paper/15 text-smoke hover:text-paper"
    }`;

  return (
    <div className="rounded-sm border border-paper/15 bg-paper/[0.03] p-4">
      {/* Artists: collapsed by default so the list stays short as we add more artists.
          The header carries the current selection count. */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between"
      >
        <span className="font-condensed text-xs uppercase tracking-wider text-smoke">
          Artists {allArtists ? "· All" : `(${prefs.artists.length})`}
        </span>
        <span className={`text-smoke transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-1">
          {!allArtists && (
            <div className="flex justify-end">
              <button
                onClick={() => onChange({ ...prefs, artists: [] })}
                className="min-h-[36px] font-condensed text-[11px] uppercase tracking-wider text-smoke hover:text-accent"
              >
                Clear · select all
              </button>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {artists.map((a) => (
              <button key={a} onClick={() => toggleArtist(a)} className={chip(!allArtists && prefs.artists.includes(a))}>
                {artistLabel(a)}
              </button>
            ))}
          </div>
        </div>
      )}

      <h3 className="mt-4 font-condensed text-xs uppercase tracking-wider text-smoke">Difficulty</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DIFFICULTIES.map((d) => (
          <button key={d.value} onClick={() => onChange({ ...prefs, difficulty: d.value })} className={chip(prefs.difficulty === d.value)}>
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
