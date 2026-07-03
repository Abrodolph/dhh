import { NextRequest, NextResponse } from "next/server";
import { roundSongs, clipUrl, makeRandomToken } from "@/lib/server";
import { DURATIONS } from "@/lib/types";
import { ROUND_SIZE } from "@/lib/scoring";

// Builds a round of ROUND_SIZE distinct songs matching the filters. Reuses the
// signed `rand:` token per song, so /api/guess resolves each one unchanged and
// no answer leaks (clip names are UUIDs). Difficulty stays server-side — it's
// only revealed via the score at round end.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const artistsParam = sp.get("artists");
    const difficulty = sp.get("difficulty");

    const artists = artistsParam
      ? artistsParam.split(",").map((a) => a.trim()).filter(Boolean)
      : undefined;
    const diff = difficulty ? Number(difficulty) : undefined;

    const songs = await roundSongs(ROUND_SIZE, { artists, difficulty: diff });
    if (songs.length < ROUND_SIZE) {
      // Not enough songs match to form a full round.
      return NextResponse.json({ empty: true });
    }

    return NextResponse.json({
      puzzles: songs.map((s) => ({
        puzzleId: makeRandomToken(s.id),
        puzzleNumber: null,
        clipUrl: clipUrl(s.clip_path),
        durations: DURATIONS,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "round unavailable" }, { status: 500 });
  }
}
