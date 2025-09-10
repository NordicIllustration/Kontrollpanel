// app/api/publish/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Body-JSON vi tar emot:
 * {
 *   "screenId": "uuid",
 *   "items": [
 *     { "media_id": "uploads/xxx.mp4", "kind": "video", "duration": null, "position": 0 },
 *     { "media_id": "uploads/yyy.jpg", "kind": "image", "duration": 8, "position": 1 }
 *   ]
 * }
 */

type PublishItem = {
  media_id: string;          // storage-path i media-bucket
  kind?: "image" | "video" | null;
  duration?: number | null;  // sek för bilder
  position?: number | null;  // ordning
};

export async function POST(req: Request) {
  try {
    const { screenId, items } = (await req.json()) as {
      screenId: string;
      items: PublishItem[];
    };

    if (!screenId || !Array.isArray(items))
      return NextResponse.json(
        { error: "Bad payload: screenId och items krävs" },
        { status: 400 }
      );

    // 1) skapa ny playlist för skärmen och gör den aktiv,
    //    samt avaktivera ev. befintlig aktiv
    const { data: prevActive, error: getPrevErr } = await supabaseAdmin
      .from("playlists")
      .select("id")
      .eq("screen_id", screenId)
      .eq("is_active", true)
      .maybeSingle();

    if (getPrevErr) {
      return NextResponse.json({ error: getPrevErr.message }, { status: 500 });
    }

    if (prevActive?.id) {
      await supabaseAdmin
        .from("playlists")
        .update({ is_active: false })
        .eq("id", prevActive.id);
    }

    const { data: created, error: createErr } = await supabaseAdmin
      .from("playlists")
      .insert({
        screen_id: screenId,
        is_active: true,
        name: `Auto ${new Date().toISOString()}`,
      })
      .select("id")
      .single();

    if (createErr || !created?.id) {
      return NextResponse.json(
        { error: createErr?.message ?? "Kunde inte skapa playlist" },
        { status: 500 }
      );
    }

    const playlistId = created.id as string;

    // 2) lägg in items
    const rows = items.map((it, idx) => ({
      playlist_id: playlistId,
      media_id: it.media_id,
      kind: it.kind ?? guessKind(it.media_id),
      duration: it.duration ?? (guessKind(it.media_id) === "image" ? 8 : null),
      position: it.position ?? idx,
    }));

    const { error: insErr } = await supabaseAdmin
      .from("playlist_items")
      .insert(rows);

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, playlistId, inserted: rows.length },
      { status: 200 }
    );
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
