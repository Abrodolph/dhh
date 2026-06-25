import { NextRequest, NextResponse } from "next/server";
import {
  dailySong,
  randomSong,
  todayIST,
  puzzleNumber,
  clipUrl,
  makeRandomToken,
} from "@/lib/server";
import { DURATIONS } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") ?? "daily";
  try {
    if (mode === "random") {
      const song = await randomSong();
      return NextResponse.json({
        puzzleId: makeRandomToken(song.id),
        puzzleNumber: null,
        clipUrl: clipUrl(song.clip_path),
        durations: DURATIONS,
      });
    }
    const date = todayIST();
    const song = await dailySong(date);
    return NextResponse.json({
      puzzleId: `daily:${date}`,
      puzzleNumber: puzzleNumber(date),
      clipUrl: clipUrl(song.clip_path),
      durations: DURATIONS,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "puzzle unavailable" }, { status: 500 });
  }
}
