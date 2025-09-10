import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_req: Request, { params }: { params: { screenId: string } }) {
  const { screenId } = params;

  // Hämta skärm -> aktiv playlist
  const { data: screen } = await supabase
    .from("screens")
    .select("id, active_playlist_id")
    .eq("id", screenId)
    .single();

  if (!screen?.active_playlist_id) {
    return NextResponse.json({ items: [] });
  }

  // Hämta items + media
  const { data: items } = await supabase
    .from("playlist_items")
    .select("id, order_index, duration_sec, days_of_week, time_start, time_end, media:media_assets(url,type)")
    .eq("playlist_id", screen.active_playlist_id)
    .order("order_index", { ascending: true });

  // Filtrera mot tid/dagar
  const now = new Date();
  const dow = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][now.getDay()];
  const time = now.toTimeString().slice(0,5);

  const playable = (items ?? []).filter((it: any) => {
    if (it.days_of_week) {
      const set = new Set(String(it.days_of_week).split(",").map(s=>s.trim()));
      if (!set.has(dow)) return false;
    }
    if (it.time_start && it.time_end) {
      if (!(it.time_start <= time && time <= it.time_end)) return false;
    } else if (it.time_start && time < it.time_start) return false;
    else if (it.time_end && time > it.time_end) return false;
    return true;
  }).map((it: any) => ({
    id: it.id,
    type: it.media.type as "image"|"video",
    url: it.media.url as string,
    duration: it.media.type === "image" ? (it.duration_sec ?? 8) : 0
  }));

  return NextResponse.json({ items: playable });
}
