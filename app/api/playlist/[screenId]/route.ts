// app/api/playlist/[screenId]/route.ts
import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

type Item = {
  id: string;
  type: "video" | "image";
  url: string;
  duration?: number; // ms för bilder
};

export async function GET(
  _req: Request,
  { params }: { params: { screenId: string } }
) {
  try {
    const screenId = params.screenId;

    // 1) Hämta skärm → aktiv spellista
    const { data: screen, error: se } = await supabaseAdmin
      .from("screens")
      .select("id, active_playlist_id")
      .eq("id", screenId)
      .maybeSingle();

    if (se) throw se;
    if (!screen) {
      return NextResponse.json({ items: [], reason: "no_screen" }, { status: 200 });
    }

    if (!screen.active_playlist_id) {
      return NextResponse.json(
        { items: [], reason: "no_active_playlist" },
        { status: 200 }
      );
    }

    // 2) Hämta rader i playlisten
    const { data: rows, error: re } = await supabaseAdmin
      .from("playlist_items")
      .select(
        "id, media_id, order_index, duration_sec"
      )
      .eq("playlist_id", screen.active_playlist_id)
      .order("order_index", { ascending: true });

    if (re) throw re;

    // 3) Bygg Item[] (media_id = storage-path i bucket "media")
    const items: Item[] = (rows ?? []).map((r) => {
      const { data } = supabaseAdmin.storage.from("media").getPublicUrl(r.media_id);
      const pathLower = (r.media_id ?? "").toLowerCase();
      const isVideo = /\.(mp4|webm|mov|m4v|ogg)$/.test(pathLower);

      return {
        id: String(r.id),
        type: isVideo ? "video" : "image",
        url: data.publicUrl,
        duration: isVideo ? undefined : ((r.duration_sec ?? 8) * 1000),
      };
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    console.error("playlist route error:", e?.message || e);
    return NextResponse.json(
      { items: [], error: e?.message || "unknown_error" },
      { status: 200 }
    );
  }
}
