import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server";

// Full catalog for the guess autocomplete. Cached at the edge for 1h.
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("songs")
    .select("id,title,artist")
    .eq("active", true)
    .order("title");
  if (error) {
    return NextResponse.json({ error: "songs unavailable" }, { status: 500 });
  }
  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
  });
}
