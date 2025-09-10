import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

type PublishItem = {
  media_id: string;          // storage-path i media-bucket
  order_index: number;
  duration_sec: number;      // 0 = auto (video)
  days_of_week: string;      // "0,1,2"
  time_start: string;        // "HH:MM"
  time_end: string;          // "HH:MM"
};

export async function POST(req: Request) {
  try {
    const { playlistName, items, screenIds } = (await req.json()) as {
      playlistName: string;
      items: PublishItem[];
      screenIds: string[];
    };

    if (!playlistName || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Saknas data" }, { status: 400 });
    }
    if (!Array.isArray(screenIds) || screenIds.length === 0) {
      return NextResponse.json({ error: "Välj minst en skärm" }, { status: 400 });
    }

    // 1) Skapa ny playlist
    const { data: pl, error: plErr } = await supabaseAdmin
      .from("playlists")
      .insert({ name: playlistName })
      .select()
      .single();
    if (plErr || !pl) return NextResponse.json({ error: plErr?.message || "playlist error" }, { status: 400 });

    // 2) Lägg in items (media_id är TEXT)
    const rows = items.map((it) => ({
      playlist_id: pl.id,
      media_id: it.media_id,              // TEXT
      order_index: it.order_index,
      duration_sec: it.duration_sec ?? 0,
      days_of_week: it.days_of_week ?? "",
      time_start: it.time_start ?? "00:00",
      time_end: it.time_end ?? "23:59",
    }));

    const { error: itemsErr } = await supabaseAdmin.from("playlist_items").insert(rows);
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 400 });

    // 3) Koppla spellistan till valda skärmar som aktiv
    const { error: scrErr } = await supabaseAdmin
      .from("screens")
      .update({ active_playlist_id: pl.id })
      .in("id", screenIds);
    if (scrErr) return NextResponse.json({ error: scrErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, playlistId: pl.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
