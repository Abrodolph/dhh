import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id || !UUID.test(id)) {
      return NextResponse.json({ error: "bad id" }, { status: 400 });
    }
    // id only; username stays null. ignoreDuplicates => never overwrites an
    // existing row (preserves a username set later).
    await supabaseAdmin()
      .from("players")
      .upsert({ id }, { onConflict: "id", ignoreDuplicates: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "upsert failed" }, { status: 500 });
  }
}

// Set/update the leaderboard username. Upsert (not ignoreDuplicates) so it
// actually writes — this is the one place a username is meant to change.
export async function PATCH(req: NextRequest) {
  try {
    const { id, username } = (await req.json()) as { id?: string; username?: string };
    if (!id || !UUID.test(id)) {
      return NextResponse.json({ error: "bad id" }, { status: 400 });
    }
    const name = (username ?? "").trim().slice(0, 24);
    if (!name) {
      return NextResponse.json({ error: "empty username" }, { status: 400 });
    }
    const { error } = await supabaseAdmin()
      .from("players")
      .upsert({ id, username: name }, { onConflict: "id" });
    if (error) throw error;
    return NextResponse.json({ ok: true, username: name });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
