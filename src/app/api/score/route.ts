import { NextRequest, NextResponse } from "next/server";
import { resolvePuzzle, supabaseAdmin, verifyWinProof } from "@/lib/server";
import { MAX_ATTEMPTS } from "@/lib/types";
import { ROUND_SIZE, roundScore } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIFF_LABELS = new Set(["easy", "medium", "hard", "mixed"]);

type ResultIn = {
  puzzleId?: string;
  attempt?: number;
  correct?: boolean;
  proof?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      playerId?: string;
      results?: ResultIn[];
      secondsUsed?: number;
      artists?: string[];
      difficulty?: string;
    };
    const { playerId, results, secondsUsed } = body;

    if (!playerId || !UUID.test(playerId)) {
      return NextResponse.json({ error: "bad player id" }, { status: 400 });
    }
    if (!Array.isArray(results) || results.length !== ROUND_SIZE) {
      return NextResponse.json({ error: "bad results" }, { status: 400 });
    }

    // Recompute every song server-side. Correct claims must carry a valid signed
    // proof (from /api/guess) binding songId + attempt — otherwise it's tampering.
    const scored: { correct: boolean; attempt: number; difficulty: number }[] = [];
    for (const r of results) {
      if (!r.puzzleId || typeof r.attempt !== "number" || r.attempt < 1 || r.attempt > MAX_ATTEMPTS) {
        return NextResponse.json({ error: "bad result item" }, { status: 400 });
      }
      const song = await resolvePuzzle(r.puzzleId); // validates signature, gives difficulty
      const correct = r.correct === true;
      if (correct) {
        if (!r.proof || !verifyWinProof(song.id, r.attempt, r.proof)) {
          return NextResponse.json({ error: "invalid proof" }, { status: 400 });
        }
      }
      scored.push({ correct, attempt: r.attempt, difficulty: song.difficulty });
    }

    const { total, songsCorrect, breakdown } = roundScore(scored);

    // Wall-clock time is client-reported (accepted v1 trust); floor at 1s/song.
    const seconds = Math.min(
      Math.max(Number(secondsUsed) || 0, ROUND_SIZE),
      86_400,
    );
    const difficulty = DIFF_LABELS.has(body.difficulty ?? "") ? body.difficulty : "mixed";
    const artists = Array.isArray(body.artists)
      ? body.artists.filter((a) => typeof a === "string")
      : [];

    const admin = supabaseAdmin();
    // Make sure the FK target exists (never clobbers an existing username).
    await admin.from("players").upsert({ id: playerId }, { onConflict: "id", ignoreDuplicates: true });
    const { error } = await admin.from("scores").insert({
      player_id: playerId,
      mode: "round",
      artists,
      difficulty,
      songs_total: ROUND_SIZE,
      songs_correct: songsCorrect,
      seconds_used: seconds,
      score: total,
    });
    if (error) throw error;

    return NextResponse.json({
      score: total,
      songsCorrect,
      songsTotal: ROUND_SIZE,
      breakdown,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "score failed" }, { status: 500 });
  }
}
