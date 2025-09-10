// app/api/publish/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PublishItem = {
  mediaId: string;
  durationSeconds?: number;
  orientation?: "landscape" | "portrait";
  startTime?: string;
  endTime?: string;
  position?: number;
  days?: string[];
};

/* -------------------- helpers -------------------- */

function normalizeItems(rawItems: any): PublishItem[] {
  const items: PublishItem[] = [];

  const pushItem = (obj: any) => {
    if (!obj) return;
    const i: PublishItem = {
      mediaId: obj.mediaId ?? obj.media_id ?? obj.url ?? obj.path,
      durationSeconds:
        typeof obj.durationSeconds === "number"
          ? obj.durationSeconds
          : typeof obj.duration_sec === "number"
          ? obj.duration_sec
          : undefined,
      orientation: obj.orientation ?? (obj.portrait ? "portrait" : undefined),
      startTime: obj.startTime ?? obj.time_start,
      endTime: obj.endTime ?? obj.time_end,
      position: obj.position ?? obj.order_index,
      days: Array.isArray(obj.days)
        ? obj.days
        : Array.isArray(obj.days_of_week)
        ? obj.days_of_week
        : undefined,
    };
    if (i.mediaId) items.push(i);
  };

  if (Array.isArray(rawItems)) {
    rawItems.forEach(pushItem);
  } else if (rawItems && typeof rawItems === "object") {
    pushItem(rawItems);
  }

  // defaults
  return items.map((x, idx) => ({
    mediaId: x.mediaId,
    durationSeconds: x.durationSeconds ?? 15,
    orientation: (x.orientation ?? "landscape") as "landscape" | "portrait",
    startTime: x.startTime ?? "00:00",
    endTime: x.endTime ?? "23:59",
    position: typeof x.position === "number" ? x.position : idx,
    days: x.days ?? ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  }));
}

// plocka eventuella items[field] mönster ur form-data, t.ex. items[0][mediaId]
function parseIndexedItemsFromForm(form: FormData) {
  const map: Record<string, any> = {};

  for (const [key, value] of form.entries()) {
    const m = key.match(/^items\[(\d+)\]\[(.+)\]$/);
    if (!m) continue;
    const idx = m[1];
    const field = m[2];
    map[idx] = map[idx] || {};
    (map[idx] as any)[field] = value;
  }

  const arr = Object.keys(map)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => map[k]);

  return arr;
}

async function readPayload(req: Request) {
  const url = new URL(req.url);
  const qpScreen = url.searchParams.get("screen");
  const ctype = req.headers.get("content-type") || "";

  let screenId: string | null = null;
  let rawItems: any = null;
  let echo: any = {};

  if (ctype.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    echo.from = "json";
    screenId = body?.screenId ?? qpScreen ?? body?.screen ?? null;
    rawItems = body?.items ?? body?.item ?? body ?? null;
  } else {
    const form = await req.formData();
    echo.from = "form";
    screenId =
      (form.get("screenId") as string) ||
      (form.get("screen") as string) ||
      (form.get("screen_id") as string) ||
      qpScreen ||
      null;

    // försök parse:a items JSON-sträng
    const itemsStr = (form.get("items") as string) || (form.get("payload") as string);
    if (itemsStr) {
      try {
        rawItems = JSON.parse(itemsStr);
      } catch {
        rawItems = null;
      }
    }

    // annars försök plocka enstaka fält eller indexerade items[0][mediaId]
    if (!rawItems) {
      const indexed = parseIndexedItemsFromForm(form);
      if (indexed.length) {
        rawItems = indexed;
      } else {
        const candidate: any = {};
        for (const [k, v] of form.entries()) {
          if (["mediaId", "media_id", "url", "path", "durationSeconds", "duration_sec", "time_start", "time_end", "orientation", "order_index", "position", "days", "days_of_week"].includes(k)) {
            candidate[k] = v;
          }
        }
        if (Object.keys(candidate).length) {
          rawItems = candidate;
        }
      }
    }
    echo.formKeys = Array.from(form.keys());
  }

  const items = normalizeItems(rawItems);
  return { screenId, items, echo };
}

/* -------------------- handler -------------------- */

export async function POST(req: Request) {
  try {
    const { screenId, items, echo } = await readPayload(req);

    if (!screenId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "bad_payload",
          details:
            "screenId och items krävs. Skickar du FormData? Lägg 'screen' eller 'screenId' samt 'items' som JSON-sträng, eller använd nycklar som items[0][mediaId].",
          echo: { screenId: screenId ?? null, itemsCount: Array.isArray(items) ? items.length : 0, ...echo },
        },
        { status: 400 }
      );
    }

    // 1) Hämta/Skapa aktiv spellista för skärmen
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("playlists")
      .select("id")
      .eq("screen_id", screenId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json(
        { ok: false, error: "db_playlist_lookup_failed", details: exErr.message },
        { status: 500 }
      );
    }

    let playlistId = existing?.id as string | undefined;
    if (!playlistId) {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("playlists")
        .insert([{ screen_id: screenId, name: "Kampanj", status: "active" }])
        .select("id")
        .single();
      if (createErr) {
        return NextResponse.json(
          { ok: false, error: "db_playlist_insert_failed", details: createErr.message },
          { status: 500 }
        );
      }
      playlistId = created!.id;
    }

    // 2) Rensa gamla items
    const { error: delErr } = await supabaseAdmin.from("playlist_items").delete().eq("playlist_id", playlistId!);
    if (delErr) {
      return NextResponse.json(
        { ok: false, error: "db_items_delete_failed", details: delErr.message },
        { status: 500 }
      );
    }

    // 3) Lägg in nya items
    const rows = items.map((it, idx) => ({
      playlist_id: playlistId!,
      media_id: it.mediaId,
      position: typeof it.position === "number" ? it.position : idx,
      duration_seconds: it.durationSeconds ?? 15,
      time_start: it.startTime ?? "00:00",
      time_end: it.endTime ?? "23:59",
      orientation: it.orientation ?? "landscape",
      days: it.days ?? ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    }));

    const { error: insErr } = await supabaseAdmin.from("playlist_items").insert(rows);
    if (insErr) {
      return NextResponse.json(
        { ok: false, error: "db_items_insert_failed", details: insErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, playlistId, count: rows.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "server_error", details: String(e?.message ?? e) }, { status: 500 });
  }
}
