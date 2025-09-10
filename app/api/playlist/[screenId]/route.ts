// app/api/playlist/[screenId]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ItemRow = {
  id: string;
  media_id: string;           // lagrar storage-path t.ex. "uploads/fil.mp4"
  kind?: "image" | "video" | null;
  duration?: number | null;   // sekunder för bilder
  position?: number | null;
};

export async function GET(
  _req: Request,
  { params }: { params: { screenId: string } }
) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const bucket =
      process.env.NEXT_PUBLIC_SUPABASE_BUCKET?.trim() || "media";

    // 1) Hämta aktiv spellista för skärmen
    const { data: playlist, error: plErr } = await supabaseAdmin
      .from("playlists")
      .select("id")
      .eq("screen_id", params.screenId)
      .eq("is_active", true)
      .single();

    if (plErr || !playlist) {
      // Ingen aktiv spellista = tom lista
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    // 2) Hämta items i ordning
    const { data: items, error: itErr } = await supabaseAdmin
      .from("playlist_items")
      .select("id, media_id, kind, duration, position")
      .eq("playlist_id", playlist.id)
      .order("position", { ascending: true });

    if (itErr) {
      return NextResponse.json({ error: itErr.message }, { status: 500 });
    }

    // 3) Bygg publika URLs från storage
    const payload = (items as ItemRow[]).map((it) => {
      const url = `${baseUrl}/storage/v1/object/public/${bucket}/${it.media_id}`;
      const type = it.kind ?? guessKind(it.media_id);
      const duration =
        it.duration ?? (type === "image" ? 8 : null); // default 8s för bild

      return { id: it.id, type, url, duration };
    });

    return NextResponse.json({ items: payload }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

function guessKind(path: string): "image" | "video" {
  const p = path.toLowerCase();
  if (
    p.endsWith(".jpg") ||
    p.endsWith(".jpeg") ||
    p.endsWith(".png") ||
    p.endsWith(".gif") ||
    p.endsWith(".webp")
  ) {
    return "image";
  }
  return "video";
}
