"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@/lib/types";
import UsernameField from "./UsernameField";

type Props = {
  open: boolean;
  onClose: () => void;
  playerId: string | null;
};

function fmtTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LeaderboardModal({ open, onClose, playerId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  function refresh() {
    setEntries(null);
    fetch("/api/leaderboard?length=3")
      .then((r) => r.json())
      .then((d) => setEntries(Array.isArray(d) ? d : []))
      .catch(() => setEntries([]));
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 px-5 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Leaderboard"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-sm border border-paper/20 bg-ink p-6 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-condensed text-2xl font-bold uppercase tracking-wide text-paper">
            Leaderboard
          </h2>
          <button onClick={onClose} className="text-smoke hover:text-paper" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mt-1 font-condensed text-xs uppercase tracking-wider text-smoke">
          Best of 3 · top 20
        </p>

        <div className="mt-4">
          <UsernameField onSaved={refresh} />
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto">
          {entries === null ? (
            <p className="py-8 text-center text-smoke animate-pulse">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-smoke">
              No rounds yet — play one to get on the board.
            </p>
          ) : (
            <ol className="flex flex-col gap-1">
              {entries.map((e) => {
                const mine = e.playerId === playerId;
                return (
                  <li
                    key={e.playerId}
                    className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm ${
                      mine ? "border border-accent bg-accent/10" : "border border-transparent"
                    }`}
                  >
                    <span className="w-6 text-right font-condensed tabular-nums text-smoke">
                      {e.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-paper">
                      {e.username || "Anonymous"}
                      {mine ? " (you)" : ""}
                    </span>
                    <span className="shrink-0 text-xs text-smoke tabular-nums">
                      {e.songsCorrect}/3 · {fmtTime(e.secondsUsed)}
                    </span>
                    <span className="w-14 shrink-0 text-right font-condensed tabular-nums text-accent">
                      {e.score.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
