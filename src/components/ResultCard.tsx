"use client";

import { useState } from "react";
import type { AttemptResult, RevealAnswer } from "@/lib/types";
import { artistLabel } from "@/lib/artists";
import CoverBackdrop from "./CoverBackdrop";

type Props = {
  status: "won" | "lost";
  answer: RevealAnswer;
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
    `DHH Heardle${puzzleNumber ? ` #${puzzleNumber}` : ""}`,
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

  const query = encodeURIComponent(`${artistLabel(answer.artist)} ${answer.title}`);

  return (
    <div className="relative overflow-hidden rounded-sm border border-paper/20 bg-paper/5 p-5 text-center">
      <CoverBackdrop coverUrl={answer.coverUrl} />
      <div className="relative">
      <p className="text-sm text-smoke">
        {status === "won" ? "Got it! 🔥" : "Next time for sure."}
      </p>
      <h2 className="mt-1 font-condensed text-3xl font-bold uppercase tracking-wide">{answer.title}</h2>
      <p className="text-smoke">
        {artistLabel(answer.artist)}
        {answer.album ? ` · ${answer.album}` : ""}
      </p>

      <div className="mt-4 text-xl tracking-widest" aria-hidden>
        {emojiGrid(attempts)}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={share}
          className="min-h-[52px] rounded-sm bg-sindoor px-6 py-3.5 text-base font-medium text-paper hover:opacity-90"
        >
          {copied ? "Copied!" : "Share result"}
        </button>
        <a
          href={`https://open.spotify.com/search/${query}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[52px] items-center justify-center rounded-sm border border-paper/25 px-6 py-3.5 text-base text-paper hover:border-accent hover:text-accent"
        >
          Listen to full song →
        </a>
      </div>
      </div>
    </div>
  );
}
