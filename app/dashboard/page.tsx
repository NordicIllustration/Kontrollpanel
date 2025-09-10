"use client";

import React from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Screen = { id: string; name: string };
type Item = {
  mediaId: string;                 // storage path, t.ex. "uploads/xxx.mp4"
  previewUrl: string;              // public url för visning i UI
  durationSeconds: number;         // sekunder
  orientation: "landscape" | "portrait";
  startTime: string;               // "HH:MM"
  endTime: string;                 // "HH:MM"
};

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "media";

export default function PublishPage() {
  const [screens, setScreens] = React.useState<Screen[]>([]);
  const [screenId, setScreenId] = React.useState<string>("");
  const [items, setItems] = React.useState<Item[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string>("");

  // 1) hämta skärmar
  React.useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("screens").select("id,name").order("name");
      if (!error && data) setScreens(data as Screen[]);
    })();
  }, []);

  // 2) fil-uppladdning -> lagra som item
  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: Item[] = [];
    setBusy(true);
    setMsg("Laddar upp...");

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) {
        setMsg("Uppladdningsfel: " + upErr.message);
        setBusy(false);
        return;
      }
      // hämta public url
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
      const previewUrl = pub?.publicUrl || "";

      newItems.push({
        mediaId: key,
        previewUrl,
        durationSeconds: /\.(mp4|webm|mov)$/i.test(file.name) ? 0 : 8, // 0 = video styr själv
        orientation: "landscape",
        startTime: "00:00",
        endTime: "23:59",
      });
    }

    setItems((prev) => [...prev, ...newItems]);
    setMsg("");
    setBusy(false);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveItem(idx: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const tgt = idx + dir;
      if (tgt < 0 || tgt >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[tgt];
      next[tgt] = tmp;
      return next;
    });
  }

  async function publishNow() {
    setMsg("");
    if (!screenId) {
      setMsg("Välj en skärm först.");
      return;
    }
    if (items.length === 0) {
      setMsg("Lägg till minst en fil först.");
      return;
    }

    setBusy(true);
    try {
      // bygg ren JSON payload
      const payload = {
        screenId,
        items: items.map((it, i) => ({
          mediaId: it.mediaId,
          durationSeconds: it.durationSeconds || undefined, // videos kan ha 0 -> tolkas av spelaren
          orientation: it.orientation,
          startTime: it.startTime,
          endTime: it.endTime,
          position: i,
        })),
      };

      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setMsg("Fel vid publicering: " + (data?.details || data?.error || res.statusText));
      } else {
        setMsg("✅ Publicerat!");
      }
    } catch (e: any) {
      setMsg("Fel vid publicering: " + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Publicera</h1>

      {/* välj skärm */}
      <div className="rounded-xl border p-3">
        <label className="block text-sm font-medium mb-1">Välj skärm</label>
        <select
          className="w-full border rounded-lg p-2"
          value={screenId}
          onChange={(e) => setScreenId(e.target.value)}
        >
          <option value="">— välj —</option>
          {screens.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.id}
            </option>
          ))}
        </select>
        {screenId && (
          <div className="text-sm mt-2">
            Förhandsvisa/TV-länk:{" "}
            <Link
              href={`/display/${screenId}`}
              className="text-blue-700 underline"
              target="_blank"
            >
              /display/{screenId}
            </Link>
          </div>
        )}
      </div>

      {/* ladda upp */}
      <div className="rounded-xl border p-3">
        <div className="flex items-center gap-3">
          <input type="file" multiple onChange={onFilesSelected} />
          <span className="text-sm text-gray-600">
            Bucket: <code>{BUCKET}</code> (måste vara Public)
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Tips: Video (mp4/webm/mov) får duration = 0 (spelaren loopar). Bilder får default 8s.
        </p>
      </div>

      {/* lista */}
      <div className="rounded-xl border p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Innehåll ({items.length})</h2>
          <button
            className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
            onClick={() => setItems([])}
            disabled={busy || items.length === 0}
          >
            Töm lista
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {items.map((it, idx) => {
            const isVideo = /\.(mp4|webm|mov)$/i.test(it.previewUrl);
            return (
              <div
                key={idx}
                className="flex items-center gap-3 border rounded-lg p-2"
              >
                <div className="w-32 h-20 bg-black flex items-center justify-center overflow-hidden rounded-md">
                  {isVideo ? (
                    <video src={it.previewUrl} style={{ maxWidth: "100%", maxHeight: "100%" }} muted />
                  ) : (
                    <img src={it.previewUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100%" }} />
                  )}
                </div>

                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500">Orientering</label>
                    <select
                      className="w-full border rounded p-1"
                      value={it.orientation}
                      onChange={(e) =>
                        setItems((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], orientation: e.target.value as any };
                          return next;
                        })
                      }
                    >
                      <option value="landscape">Liggande</option>
                      <option value="portrait">Stående</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500">Varaktighet (s)</label>
                    <input
                      type="number"
                      className="w-full border rounded p-1"
                      value={it.durationSeconds}
                      onChange={(e) =>
                        setItems((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], durationSeconds: Number(e.target.value) || 0 };
                          return next;
                        })
                      }
                      placeholder="0 (video)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500">Start-tid</label>
                    <input
                      type="time"
                      className="w-full border rounded p-1"
                      value={it.startTime}
                      onChange={(e) =>
                        setItems((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], startTime: e.target.value };
                          return next;
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500">Slut-tid</label>
                    <input
                      type="time"
                      className="w-full border rounded p-1"
                      value={it.endTime}
                      onChange={(e) =>
                        setItems((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], endTime: e.target.value };
                          return next;
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 border rounded"
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    title="Upp"
                  >
                    ↑
                  </button>
                  <button
                    className="px-2 py-1 border rounded"
                    onClick={() => moveItem(idx, +1)}
                    disabled={idx === items.length - 1}
                    title="Ner"
                  >
                    ↓
                  </button>
                  <button
                    className="px-2 py-1 border rounded text-red-600"
                    onClick={() => removeItem(idx)}
                    title="Ta bort"
                  >
                    Ta bort
                  </button>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="text-sm text-gray-600">Inga filer tillagda ännu.</div>
          )}
        </div>
      </div>

      {/* publicera */}
      <div className="flex items-center gap-2">
        <button
          className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          onClick={publishNow}
          disabled={busy}
        >
          {busy ? "Publicerar..." : "Publicera nu"}
        </button>
        {screenId && (
          <Link
            href={`/display/${screenId}`}
            target="_blank"
            className="px-4 py-2 rounded-lg border"
          >
            Öppna spelare
          </Link>
        )}
      </div>

      {!!msg && (
        <div
          className={`p-3 rounded-lg border ${
            msg.startsWith("✅") ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"
          }`}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
