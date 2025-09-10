"use client";

import React from "react";
import supabase from "@/lib/supabaseBrowser";
import Link from "next/link";

type ScreenRow = { id: string; name: string | null; orientation: "landscape"|"portrait"; active_playlist_id: string | null };
type ItemRow = { media_id: string; order_index: number; duration_sec: number; days_of_week: string | null; time_start: string | null; time_end: string | null };

function timeInRange(now: string, start: string, end: string) {
  // "HH:MM" jämförelse
  return start <= now && now <= end;
}

export default function NowPlayingPage() {
  const [rows, setRows] = React.useState<
    { screen: ScreenRow; current?: { url: string; type: "image"|"video" } | null }[]
  >([]);

  React.useEffect(() => {
    (async () => {
      const { data: screens } = await supabase.from("screens").select("id,name,orientation,active_playlist_id").order("name", { ascending: true });
      const list = (screens as ScreenRow[]) ?? [];
      const out: any[] = [];

      // Hämta items per playlist
      for (const s of list) {
        if (!s.active_playlist_id) { out.push({ screen: s, current: null }); continue; }
        const { data: items } = await supabase
          .from("playlist_items")
          .select("media_id, order_index, duration_sec, days_of_week, time_start, time_end")
          .eq("playlist_id", s.active_playlist_id)
          .order("order_index", { ascending: true });

        const arr = (items as ItemRow[]) ?? [];
        const now = new Date();
        const dow = now.getDay(); // 0..6
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const t = `${hh}:${mm}`;

        const match = arr.find((it) => {
          const days = (it.days_of_week ?? "").split(",").filter(Boolean).map((n)=>Number(n));
          const start = it.time_start ?? "00:00";
          const end = it.time_end ?? "23:59";
          return (days.length ? days.includes(dow) : true) && timeInRange(t, start, end);
        });

        if (!match) { out.push({ screen: s, current: null }); continue; }

        const { data: urlData } = supabase.storage.from("media").getPublicUrl(match.media_id);
        // Gissa typ
        const type = (match.media_id.toLowerCase().match(/\.(mp4|webm|mov)$/) ? "video" : "image") as "image"|"video";
        out.push({ screen: s, current: { url: urlData.publicUrl, type } });
      }

      setRows(out);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Nu visas</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ screen, current }) => (
          <div key={screen.id} className="rounded-2xl border border-[color:var(--line)] bg-[var(--panel)] p-3">
            <div className="mb-2 text-sm text-[var(--ink-600)]">
              {screen.name ?? `Skärm ${screen.id.slice(0,6)}`} · {screen.orientation === "portrait" ? "Lodrät" : "Vågrät"}
            </div>
            <div className="aspect-video w-full overflow-hidden rounded-xl ring-1 ring-[color:var(--line)]"
                 style={{ aspectRatio: screen.orientation === "portrait" ? "9 / 16" : "16 / 9" }}>
              {!current ? (
                <div className="grid h-full place-items-center text-sm text-[var(--ink-600)]">Ingen matchande media just nu</div>
              ) : current.type === "image" ? (
                <img src={current.url} className="h-full w-full object-contain bg-black" />
              ) : (
                <video src={current.url} className="h-full w-full object-contain bg-black" muted autoPlay loop />
              )}
            </div>
            <div className="mt-2 text-right">
              <Link href={`/display/${screen.id}`} className="text-sm text-[var(--blue-700)] underline">Öppna spelare</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
