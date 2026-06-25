"use client";

import { useState } from "react";
import type { AttemptResult } from "@/lib/types";

type Props = {
  status: "won" | "lost";
  answer: { title: string; artist: string; album: string | null };
  attempts: AttemptResult[];
  puzzleNumber: number | null;
};

function emojiGrid(attempts: AttemptResult[]): string {
  const cells: string[] = attempts.map((a) =>
    a.kind === "correct" ? "✅" : a.kind === "skip" ? "🔇" : a.artistMatch ? "🟨" : "🟥",
  );
  while (cells.length < 5) cells.push("⬜");
  return cells.join("");
}

export default function ResultCard({ status, answer, attempts, puzzleNumber }: Props) {
  const [copied, setCopied] = useState(false);

  const shareText = [
    `Pehchaan${puzzleNumber ? ` #${puzzleNumber}` : ""}`,
    emojiGrid(attempts),
    typeof window !== "undefined" ? window.location.origin : "",
  ].join("\n");

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  }

  const query = encodeURIComponent(`${answer.artist} ${answer.title}`);

  return (
    <div className="rounded-sm border border-paper/20 bg-paper/5 p-5 text-center">
      <p className="text-sm text-smoke">
        {status === "won" ? "Pehchaan liya! 🔥" : "Agli baar pakka."}
      </p>
      <h2 className="mt-1 text-2xl font-medium">{answer.title}</h2>
      <p className="text-smoke">
        {answer.artist}
        {answer.album ? ` · ${answer.album}` : ""}
      </p>

      <div className="mt-4 text-xl tracking-widest" aria-hidden>
        {emojiGrid(attempts)}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          onClick={share}
          className="rounded-sm bg-sindoor px-6 py-2.5 font-medium text-paper hover:opacity-90"
        >
          {copied ? "Copied!" : "Share result"}
        </button>
        <a
          href={`https://open.spotify.com/search/${query}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-sm border border-paper/25 px-6 py-2.5 text-paper hover:border-amber hover:text-amber"
        >
          Full song sun →
        </a>
      </div>
    </div>
  );
}
