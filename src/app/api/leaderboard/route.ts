import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server";
import { ROUND_SIZE } from "@/lib/scoring";
import type { LeaderboardEntry } from "@/lib/types";

// One board per round length (songs_total). Best round per player, top 20.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const lengthParam = Number(req.nextUrl.searchParams.get("length"));
    const length = lengthParam === ROUND_SIZE ? lengthParam : ROUND_SIZE;

    // Pull a generous top slice, then keep each player's best row.
    const { data, error } = await supabaseAdmin()
      .from("scores")
      .select("player_id, score, songs_correct, seconds_used, created_at, players(username)")
      .eq("mode", "round")
      .eq("songs_total", length)
      .order("score", { ascending: false })
      .order("seconds_used", { ascending: true })
      .limit(300);
    if (error) throw error;

    const seen = new Set<string>();
    const entries: LeaderboardEntry[] = [];
    for (const row of (data ?? []) as unknown as Array<{
      player_id: string;
      score: number | null;
      songs_correct: number | null;
      seconds_used: number | null;
      created_at: string;
      players: { username: string | null } | { username: string | null }[] | null;
    }>) {
      if (seen.has(row.player_id)) continue; // already have this player's best
      seen.add(row.player_id);
      const p = Array.isArray(row.players) ? row.players[0] : row.players;
      entries.push({
        rank: entries.length + 1,
        playerId: row.player_id,
        username: p?.username ?? null,
        score: row.score ?? 0,
        songsCorrect: row.songs_correct ?? 0,
        secondsUsed: row.seconds_used ?? 0,
        createdAt: row.created_at,
      });
      if (entries.length >= 20) break;
    }

    return NextResponse.json(entries, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "leaderboard unavailable" }, { status: 500 });
  }
}
