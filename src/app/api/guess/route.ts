import { NextRequest, NextResponse } from "next/server";
import { resolvePuzzle, supabaseAdmin, makeWinProof } from "@/lib/server";
import { MAX_ATTEMPTS } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      puzzleId?: string;
      songId?: string | null;
      attempt?: number;
    };
    const { puzzleId, songId, attempt } = body;
    if (!puzzleId || typeof attempt !== "number" || attempt < 1 || attempt > MAX_ATTEMPTS) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }

    const answer = await resolvePuzzle(puzzleId);

    // Skip
    if (!songId) {
      const reveal = attempt >= MAX_ATTEMPTS;
      return NextResponse.json({
        correct: false,
        artistMatch: false,
        ...(reveal && { answer: pub(answer) }),
      });
    }

    const correct = songId === answer.id;
    let artistMatch = false;
    if (!correct) {
      const { data } = await supabaseAdmin()
        .from("songs")
        .select("artist")
        .eq("id", songId)
        .single();
      artistMatch = !!data && data.artist === answer.artist;
    }

    const reveal = correct || attempt >= MAX_ATTEMPTS;
    return NextResponse.json({
      correct,
      artistMatch,
      ...(reveal && { answer: pub(answer) }),
      // Signed proof for round scoring — only when the guess is actually right.
      ...(correct && { proof: makeWinProof(answer.id, attempt) }),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "guess failed" }, { status: 500 });
  }
}

function pub(s: {
  title: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
}) {
  return { title: s.title, artist: s.artist, album: s.album, coverUrl: s.cover_url };
}
