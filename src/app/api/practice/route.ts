import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, clipUrl, makeRandomToken } from "@/lib/server";
import { DURATIONS } from "@/lib/types";

// Practice-only filtered random pick. Does NOT touch daily-pick logic.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const artistsParam = sp.get("artists"); // comma-separated; absent = all
    const difficulty = sp.get("difficulty"); // "1"|"2"|"3"; absent = mixed

    let query = supabaseAdmin()
      .from("songs")
      .select("id,clip_path")
      .eq("active", true);

    if (artistsParam) {
      const artists = artistsParam.split(",").map((a) => a.trim()).filter(Boolean);
      if (artists.length) query = query.in("artist", artists);
    }
    if (difficulty) {
      const d = Number(difficulty);
      if (d === 1 || d === 2 || d === 3) query = query.eq("difficulty", d);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ empty: true }); // 200, friendly empty state
    }

    const song = data[Math.floor(Math.random() * data.length)];
    return NextResponse.json({
      puzzleId: makeRandomToken(song.id), // existing rand: token; /api/guess resolves it unchanged
      puzzleNumber: null,
      clipUrl: clipUrl(song.clip_path),
      durations: DURATIONS,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "practice unavailable" }, { status: 500 });
  }
}
