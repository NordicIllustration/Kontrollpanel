"use client";

import React from "react";
import supabase from "@/lib/supabaseBrowser";
import { PlayCircle } from "lucide-react";

type Event = {
  id: string;
  created_at: string;
  actor_id: string | null;
  event_type: string;
  description: string | null;
  playlist_id: string | null;
  screen_ids: string[] | null;
};

export default function ActivityPage() {
  const [events, setEvents] = React.useState<Event[]>([]);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false }).limit(100);
      setEvents((data as Event[]) ?? []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-[var(--ink-900)]">Händelseflöde</h1>

      <div className="overflow-hidden rounded-2xl ring-1 ring-[color:var(--line)]">
        <table className="min-w-full divide-y divide-[color:var(--line)]">
          <thead className="bg-[var(--ink-50)]">
            <tr>
              {["Tid", "Händelse", "Playlist", "Skärmar"].map(h=>(
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ink-700)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--line)] bg-[var(--panel)]">
            {events.map(ev => (
              <tr key={ev.id} className="hover:bg-[var(--blue-25)]">
                <td className="px-4 py-3 text-[var(--ink-700)]">{new Date(ev.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-[var(--ink-900)]">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-[var(--blue-700)]" />
                    {ev.description ?? ev.event_type}
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--ink-700)]">{ev.playlist_id ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--ink-700)]">{(ev.screen_ids ?? []).join(", ") || "—"}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td className="px-4 py-6 text-[var(--ink-600)]" colSpan={4}>Inga händelser ännu.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
