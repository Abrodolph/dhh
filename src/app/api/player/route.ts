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
