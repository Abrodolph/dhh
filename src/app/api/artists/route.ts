import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server";

// Distinct artists with active songs, for the practice-mode filter.
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("songs")
    .select("artist")
    .eq("active", true);
  if (error) {
    return NextResponse.json({ error: "artists unavailable" }, { status: 500 });
  }
  const artists = Array.from(new Set((data ?? []).map((r) => r.artist))).sort();
  return NextResponse.json(artists, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
  });
}
