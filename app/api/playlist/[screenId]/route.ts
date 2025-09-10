// app/api/playlist/[screenId]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _req: Request,
  { params }: { params: { screenId: string } }
) {
  const screenId = params.screenId;
  try {
    // Hämta aktiv spellista för skärmen
    const { data: pl, error: plErr } = await supabaseAdmin
      .from("playlists")
      .select("id,name,status,updated_at")
      .eq("screen_id", screenId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (plErr) {
      return NextResponse.json({ ok: false, error: "db_playlist_read_failed", details: plErr.message }, { status: 500 });
    }
    if (!pl) {
      return NextResponse.json({ ok: true, playlist: null, items: [] });
    }

    const { data: items, error: itErr } = await supabaseAdmin
      .from("playlist_items")
      .select("id, media_id, position, duration_seconds, time_start, time_end, orientation, days")
      .eq("playlist_id", pl.id)
      .order("position", { ascending: true });

    if (itErr) {
      return NextResponse.json({ ok: false, error: "db_items_read_failed", details: itErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      playlist: pl,
      items: (items ?? []).map((r) => ({
        id: r.id,
        mediaId: r.media_id,
        position: r.position ?? 0,
        durationSeconds: r.duration_seconds ?? 15,
        startTime: r.time_start ?? "00:00",
        endTime: r.time_end ?? "23:59",
        orientation: r.orientation ?? "landscape",
        days: r.days ?? ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        publicUrl: r.media_id, // frontend kan använda direkt (du laddar från bucket via publika URL:n/edge)
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "server_error", details: String(e?.message ?? e) }, { status: 500 });
  }
}
