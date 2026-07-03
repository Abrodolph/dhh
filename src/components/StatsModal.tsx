"use client";

import { useEffect, useState } from "react";
import { loadStats } from "@/lib/storage";
import type { Stats } from "@/lib/types";

type Props = { open: boolean; onClose: () => void };

export default function StatsModal({ open, onClose }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (open) setStats(loadStats());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !stats) return null;

  const winPct = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  const maxBar = Math.max(1, ...stats.dist);
  const cards = [
    { label: "Played", value: stats.played },
    { label: "Win %", value: winPct },
    { label: "Streak", value: stats.streak },
    { label: "Max", value: stats.maxStreak },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 px-5 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Your statistics"
    >
      <div
        className="w-full max-w-sm rounded-sm border border-paper/20 bg-ink p-6 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-condensed text-2xl font-bold uppercase tracking-wide text-paper">
            Statistics
          </h2>
          <button onClick={onClose} className="text-smoke hover:text-paper" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          {cards.map((c) => (
            <div key={c.label}>
              <div className="font-condensed text-3xl font-bold tabular-nums text-paper">
                {c.value}
              </div>
              <div className="mt-1 font-condensed text-[10px] uppercase tracking-wider text-smoke">
                {c.label}
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-6 font-condensed text-xs uppercase tracking-wider text-smoke">
          Guess distribution
        </h3>
        <div className="mt-2 flex flex-col gap-1.5">
          {stats.dist.map((count, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-3 text-right text-xs tabular-nums text-smoke">{i + 1}</span>
              <div className="flex-1">
                <div
                  className="flex justify-end rounded-sm bg-accent px-2 py-0.5 text-xs font-medium tabular-nums text-ink"
                  style={{ width: `${Math.max(10, (count / maxBar) * 100)}%` }}
                >
                  {count}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
