"use client";

import React from "react";
import {
  Upload, Clock, CalendarDays, Play, Pause, X, Maximize2,
  ArrowUp, ArrowDown, Trash2, Monitor, CheckCircle2
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "media";

type Asset = {
  id?: string;
  name: string;
  type: "image" | "video";
  path: string;
  url: string;              // public URL (preview)
  duration_sec: number;
};
type Screen = { id: string; name: string; location?: string };

export default function PublishWizard() {
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [uploading, setUploading] = React.useState(false);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [screens, setScreens] = React.useState<Screen[]>([]);
  const [selectedScreens, setSelectedScreens] = React.useState<string[]>([]);
  const [playlistName, setPlaylistName] = React.useState("Kampanj " + new Date().toLocaleDateString());
  const [days, setDays] = React.useState<string[]>(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]);
  const [timeStart, setTimeStart] = React.useState<string>("00:00");
  const [timeEnd, setTimeEnd] = React.useState<string>("23:59");
  const [publishing, setPublishing] = React.useState(false);
  const [done, setDone] = React.useState(false);

  // preview & confirm
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [confirmArmed, setConfirmArmed] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.from("screens").select("id,name,location").order("created_at", { ascending: false });
      if (data) setScreens(data as Screen[]);
    })();
  }, []);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const list: Asset[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const isVideo = ["mp4","webm","mov","m4v"].includes(ext);
        const type: "image" | "video" = isVideo ? "video" : "image";
        const filename = `${crypto.randomUUID()}.${ext}`;
        const path = filename;

        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (upErr) {
          if (String(upErr.message).includes("Bucket not found")) {
            throw new Error(`Bucket "${BUCKET}" finns inte. Skapa den i Supabase → Storage (Public: ON).`);
          }
          throw upErr;
        }

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        let duration = type === "image" ? 8 : await getVideoDuration(file);
        if (!duration || duration < 1) duration = 5;

        const { data: inserted, error: dbErr } = await supabase
          .from("media_assets")
          .insert({ name: file.name, type, path, url: data.publicUrl, duration_sec: duration })
          .select()
          .single();
        if (dbErr) throw dbErr;

        list.push({
          id: inserted.id,
          name: file.name,
          type,
          path,
          url: data.publicUrl,
          duration_sec: duration,
        });
      }
      setAssets((prev) => [...prev, ...list]);
      setStep(2);
    } catch (e: any) {
      alert("Uppladdning misslyckades: " + (e?.message ?? e));
    } finally {
      setUploading(false);
    }
  };

  const getVideoDuration = (file: File): Promise<number> =>
    new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const v = document.createElement("video");
        v.preload = "metadata";
        v.src = url;
        v.onloadedmetadata = () => {
          resolve(Math.round(v.duration || 0));
          URL.revokeObjectURL(url);
        };
        v.onerror = () => resolve(5);
      } catch { resolve(5); }
    });

  const move = (i: number, dir: "up" | "down") => {
    setAssets((prev) => {
      const next = prev.slice();
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const remove = (i: number) => setAssets((prev) => prev.filter((_, idx) => idx !== i));
  const toggleDay = (d: string) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const toggleScreen = (id: string) => setSelectedScreens((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const publish = async () => {
    if (assets.length === 0) return alert("Lägg till minst ett media.");
    if (selectedScreens.length === 0) return alert("Välj minst en skärm.");
    if (!confirmArmed) {
      // första tryck på röda knappen armar bekräftelsen
      setConfirmArmed(true);
      return;
    }
    setPublishing(true);
    try {
      const body = {
        playlistName,
        items: assets.map((a, idx) => ({
          media_id: a.id, order_index: idx, duration_sec: a.duration_sec,
          days_of_week: days.join(","), time_start: timeStart, time_end: timeEnd,
        })),
        screenIds: selectedScreens,
      };
      const res = await fetch("/api/publish", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? JSON.stringify(json));
      setDone(true);
      setStep(4);
      setConfirmArmed(false);
    } catch (e: any) {
      alert("Publicering misslyckades: " + (e?.message ?? e));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Steps step={step} />
      {/* STEG 1 – Ladda upp */}
      {step === 1 && (
        <section className="rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)]">
          <h2 className="text-lg font-semibold">1. Ladda upp media</h2>
          <p className="mt-1 text-[var(--ink-600)]">Bilder (PNG/JPG) eller video (MP4/WebM/MOV).</p>
          <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-[color:var(--line)] bg-[var(--blue-50)] p-10 text-center">
            <Upload className="h-8 w-8 text-[var(--blue-700)]" />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-4 py-2 text-sm font-medium hover:bg-[var(--blue-25)]">
              Välj filer
              <input type="file" multiple className="hidden" accept="image/*,video/*" onChange={(e) => onFiles(e.target.files)} />
            </label>
            {uploading && <div className="text-sm text-[var(--ink-700)]">Laddar upp…</div>}
          </div>
        </section>
      )}

      {/* STEG 2 – Ordna & tider + Thumbnails */}
      {step === 2 && (
        <section className="rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">2. Ordna & Tider</h2>
            {assets.length > 0 && (
              <button
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm hover:bg-[var(--blue-50)]"
              >
                <Maximize2 className="h-4 w-4" /> Förhandsgranska
              </button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {assets.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-[color:var(--line)] bg-[var(--blue-25)] p-3">
                <div className="flex items-center gap-3">
                  {/* THUMBNAIL */}
                  <div className="h-14 w-24 overflow-hidden rounded-lg ring-1 ring-[color:var(--line)] bg-black">
                    {a.type === "image" ? (
                      <img src={a.url} className="h-full w-full object-cover" />
                    ) : (
                      <video src={a.url} className="h-full w-full object-cover" muted playsInline />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-[var(--ink-900)]">{a.name}</div>
                    <div className="text-xs text-[var(--ink-600)]">{a.type.toUpperCase()}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[var(--ink-600)]" />
                  <input
                    type="number" min={1}
                    className="w-20 rounded-lg border border-[color:var(--line)] bg-[var(--panel)] px-2 py-1 text-sm"
                    value={a.duration_sec}
                    onChange={(e) => {
                      const v = Math.max(1, Number(e.target.value || 1));
                      setAssets((prev) => prev.map((x, idx) => (idx === i ? { ...x, duration_sec: v } : x)));
                    }}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button className="rounded-lg p-2 hover:bg-[var(--blue-50)]" onClick={() => move(i, "up")} aria-label="Upp">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg p-2 hover:bg-[var(--blue-50)]" onClick={() => move(i, "down")} aria-label="Ner">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg p-2 hover:bg-[var(--blue-50)]" onClick={() => remove(i)} aria-label="Ta bort">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[color:var(--line)] p-4">
              <div className="mb-2 flex items-center gap-2 font-medium"><CalendarDays className="h-4 w-4" /> Visa dessa dagar</div>
              <div className="flex flex-wrap gap-2">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
                  <button key={d} onClick={() => toggleDay(d)}
                    className={`rounded-full px-3 py-1 text-sm ring-1 ring-[color:var(--line)] ${
                      days.includes(d) ? "bg-[var(--blue-50)] text-[var(--blue-800)]" : "bg-[var(--panel)]"
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[color:var(--line)] p-4">
              <div className="mb-2 flex items-center gap-2 font-medium"><Clock className="h-4 w-4" /> Tidsfönster (dagligen)</div>
              <div className="flex items-center gap-2">
                <input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} className="rounded-lg border border-[color:var(--line)] bg-[var(--panel)] px-2 py-1" />
                <span>till</span>
                <input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} className="rounded-lg border border-[color:var(--line)] bg-[var(--panel)] px-2 py-1" />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button className="rounded-xl border border-[color:var(--line)] px-4 py-2 text-sm hover:bg-[var(--blue-50)]" onClick={() => setStep(1)}>
              Tillbaka
            </button>
            <button className="rounded-xl bg-[var(--blue-700)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--blue-600)]" onClick={() => setStep(3)}>
              Nästa
            </button>
          </div>

          {/* PREVIEW OVERLAY */}
          {previewOpen && (
            <PreviewOverlay assets={assets} onClose={() => setPreviewOpen(false)} />
          )}
        </section>
      )}

      {/* STEG 3 – Skärmar + bekräftelseknapp */}
      {step === 3 && (
        <section className="rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)]">
          <h2 className="text-lg font-semibold">3. Välj skärmar</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {screens.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedScreens((prev) => prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id])}
                className={`flex items-center justify-between rounded-xl border border-[color:var(--line)] p-4 text-left ${
                  selectedScreens.includes(s.id) ? "bg-[var(--blue-50)]" : "bg-[var(--panel)] hover:bg-[var(--blue-25)]"
                }`}>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[var(--blue-100)] p-2 ring-1 ring-[color:var(--line)]">
                    <Monitor className="h-5 w-5 text-[var(--blue-700)]" />
                  </div>
                  <div>
                    <div className="font-medium text-[var(--ink-900)]">{s.name}</div>
                    {s.location && <div className="text-sm text-[var(--ink-600)]">{s.location}</div>}
                  </div>
                </div>
                {selectedScreens.includes(s.id) && <CheckCircle2 className="h-5 w-5 text-[var(--blue-700)]" />}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
            <input className="rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
              value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} placeholder="Namn på playlist/kampanj" />
            <div className="flex items-center justify-end gap-2">
              <button className="rounded-xl border border-[color:var(--line)] px-4 py-2 text-sm hover:bg-[var(--blue-50)]" onClick={() => setStep(2)}>
                Tillbaka
              </button>

              {/* 🔴 Röd bekräftelse-knapp i två steg */}
              <button
                disabled={publishing}
                onClick={publish}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white
                  ${confirmArmed ? "bg-[var(--red-700)] hover:opacity-90" : "bg-[var(--red-700)]/70 hover:bg-[var(--red-700)]"}
                  disabled:opacity-50`}
                title={confirmArmed ? "Bekräfta publicering" : "Förhandsgranska och klicka igen för att bekräfta"}
              >
                {publishing ? "Publicerar…" : confirmArmed ? "Bekräfta publicering" : "Är du säker? Publicera"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STEG 4 – Klart */}
      {step === 4 && (
        <section className="rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)]">
          <h2 className="text-lg font-semibold">4. Klart!</h2>
          <p className="mt-1">Öppna spelaren nedan för första skärmen du valde:</p>
          {done && selectedScreens[0] && (
            <a
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--blue-700)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--blue-600)]"
              href={`/display/${selectedScreens[0]}`} target="_blank" rel="noreferrer"
            >
              Öppna spelare
            </a>
          )}
        </section>
      )}
    </div>
  );
}

/* ------- Hjälpkomponenter ------- */

function Steps({ step }: { step: number }) {
  const items = [
    { n: 1, label: "Ladda upp" },
    { n: 2, label: "Ordna & tider" },
    { n: 3, label: "Skärmar" },
    { n: 4, label: "Publicerat" },
  ];
  return (
    <div className="flex items-center gap-2">
      {items.map((it, idx) => (
        <React.Fragment key={it.n}>
          <div className={`flex items-center gap-2 rounded-full px-3 py-1 ring-1 ring-[color:var(--line)] ${
            step === it.n ? "bg-[var(--blue-50)] text-[var(--blue-800)]" : "bg-[var(--panel)]"
          }`}>
            <span className="text-sm">{it.n}.</span>
            <span className="text-sm font-medium">{it.label}</span>
          </div>
          {idx < items.length - 1 && <div className="h-px flex-1 bg-[var(--line)]" />}
        </React.Fragment>
      ))}
    </div>
  );
}

/** Preview-overlay som simulerar spelaren */
function PreviewOverlay({ assets, onClose }: { assets: Asset[]; onClose: () => void }) {
  const [idx, setIdx] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);

  const item = assets[idx % assets.length];

  React.useEffect(() => {
    if (!playing || !item || item.type !== "image") return;
    const t = setTimeout(() => setIdx((x) => (x + 1) % assets.length), Math.max(1000, item.duration_sec * 1000));
    return () => clearTimeout(t);
  }, [item, assets.length, playing]);

  const advance = () => setIdx((x) => (x + 1) % assets.length);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="relative h-[80vh] w-[90vw] max-w-5xl overflow-hidden rounded-2xl bg-black ring-1 ring-[color:var(--line)]">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20">
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="absolute left-3 top-3 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
          title={playing ? "Pausa" : "Spela"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        <div className="flex h-full w-full items-center justify-center">
          {item.type === "image" ? (
            <img src={item.url} className="max-h-full max-w-full object-contain" />
          ) : (
            <video
              key={item.id + "-" + idx}
              src={item.url}
              className="max-h-full max-w-full object-contain"
              autoPlay
              muted
              playsInline
              onEnded={advance}
            />
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-black/40 p-3 text-center text-white text-sm">
          Visar: <span className="font-medium">{item.name}</span> ({item.type}) · {item.duration_sec}s
        </div>
      </div>
    </div>
  );
}
