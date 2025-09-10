"use client";

import React from "react";
import Link from "next/link";
import supabase from "@/lib/supabaseBrowser";

type Screen = {
  id: string;
  name: string | null;
  location?: string | null;
  created_at?: string | null;
};

export default function ScreensClient() {
  const [screens, setScreens] = React.useState<Screen[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("screens")
      .select("id, name, location, created_at")
      .order("created_at", { ascending: false }) // Sorterar på created_at (säkert fält)
      .limit(100);

    if (error) {
      setError(error.message);
    } else {
      setScreens((data as Screen[]) ?? []);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    let ignore = false;

    load();

    // Realtime uppdatering när screens ändras
    const channel = supabase
      .channel("screens-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "screens" },
        () => {
          if (!ignore) load();
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--ink-900)]">Skärmar</h1>
        <button
          onClick={load}
          className="rounded-lg border border-[color:var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm hover:bg-[var(--blue-25)]"
        >
          Uppdatera
        </button>
      </div>

      {loading && (
        <div className="text-sm text-[var(--ink-600)]">Laddar skärmar…</div>
      )}
      {error && (
        <div className="text-sm text-red-600">
          Kunde inte hämta skärmar: {error}
        </div>
      )}

      {!loading && !error && screens.length === 0 && (
        <div className="text-sm text-[var(--ink-600)]">
          Inga skärmar hittades ännu.
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {screens.map((s) => (
          <li
            key={s.id}
            className="rounded-xl ring-1 ring-[color:var(--line)] bg-[var(--panel)] p-4 flex items-center justify-between"
          >
            <div>
              <div className="font-medium text-[var(--ink-900)]">
                {s.name || `Skärm ${s.id.slice(0, 6)}`}
              </div>
              <div className="text-xs text-[var(--ink-600)]">
                {s.location || "—"}
              </div>
              {s.created_at && (
                <div className="mt-0.5 text-xs text-[var(--ink-600)]">
                  Skapad: {new Date(s.created_at).toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Link
                href={`/display/${s.id}`}
                className="rounded-lg border border-[color:var(--line)] px-3 py-1.5 text-sm hover:bg-[var(--blue-25)]"
              >
                Öppna spelare
              </Link>
              <Link
                href={`/dashboard/publish?screen=${s.id}`}
                className="rounded-lg bg-[var(--blue-700)] text-white px-3 py-1.5 text-sm hover:opacity-90"
              >
                Publicera
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
