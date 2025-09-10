// app/api/heartbeat/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { screenId } = await req.json();

    if (!screenId) {
      return NextResponse.json({ ok: false, error: "screenId missing" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("screens")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", screenId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
