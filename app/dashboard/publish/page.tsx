"use client";

import React from "react";
import { Upload, Play, Trash2, ArrowUp, ArrowDown, Clock, Monitor, Cast as CastIcon, AlertTriangle } from "lucide-react";
import supabase from "@/lib/supabaseBrowser";
import ChromecastButton from "@/components/ChromecastButton";

type MediaRow = {
  id: string;
  url: string;
  type: "image" | "video";
  duration_sec: number;
  days_of_week: number[];
  time_start: string;
  time_end: string;
  order_index: number;
};

type ScreenRow = { id: string; name: string | null; orientation: "landscape" | "portrait" };

export default function PublishPage() {
  const [items, setItems] = React.useState<MediaRow[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [screens, setScreens] = React.useState<ScreenRow[]>([]);
  const [selectedScreens, setSelectedScreens] = React.useState<Record<string, boolean>>({});
  const [playlistName, setPlaylistName] = React.useState("Kampanj");
  const [preview, setPreview] = React.useState(false);

  // ⬇️ nytt: varning om man publicerar utan preview
  const [warnedNoPreview, setWarnedNoPreview] = React.useState(false);

  // Chromecast
  const [castSession, setCastSession] = React.useState<any>(null);
  const [castDeviceName, setCastDeviceName] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.from("screens").select("id, name, orientation").order("name", { ascending: true });
      setScreens((data as ScreenRow[]) ?? []);
    })();
  }, []);

  const nextIndex = React.useMemo(
    () => (items.length ? Math.max(...items.map((i) => i.order_index)) + 1 : 1),
    [items]
  );

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `uploads/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file);
      if (error) { alert("Fel vid uppladdning: " + error.message); continue; }
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      const isVideo = file.type.startsWith("video");
      const row: MediaRow = {
        id: path,
        url: data.publicUrl,
        type: isVideo ? "video" : "image",
        duration_sec: isVideo ? 0 : 8,
        days_of_week: [1,2,3,4,5,6,0],
        time_start: "00:00",
        time_end: "23:59",
        order_index: nextIndex,
      };
      setItems((prev) => [...prev, row]);
    }
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    addFiles(e.dataTransfer.files);
  };
  const handleUploadInput: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    addFiles(e.target.files); e.currentTarget.value = "";
  };

  const move = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const a = copy[idx].order_index;
      copy[idx].order_index = copy[target].order_index;
      copy[target].order_index = a;
      const tmp = copy[idx]; copy[idx] = copy[target]; copy[target] = tmp;
      return copy;
    });
  };
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const setDays = (id: string, dow: number) =>
    setItems((prev) => prev.map((i) =>
      i.id === id
        ? { ...i, days_of_week: i.days_of_week.includes(dow)
            ? i.days_of_week.filter((d) => d !== dow)
            : [...i.days_of_week, dow].sort() }
        : i
    ));
  const setField = <K extends keyof MediaRow>(id: string, key: K, val: MediaRow[K]) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [key]: val } : i)));
  const toggleScreen = (id: string) => setSelectedScreens((prev) => ({ ...prev, [id]: !prev[id] }));
  const connected = !!castSession;

  const handlePublish = async () => {
    const screenIds = Object.entries(selectedScreens).filter(([,v])=>v).map(([k])=>k);
    if (!screenIds.length) { alert("Välj minst en skärm."); return; }
    if (!items.length) { alert("Lägg till minst ett media."); return; }

    // ⬇️ varna om man inte förhandsgranskat (en gång)
    if (!preview && !warnedNoPreview) {
      const ok = confirm("Tips: Förhandsgranska gärna innan publicering.\nVill du fortsätta ändå?");
      if (!ok) return;
      setWarnedNoPreview(true);
    }

    const payloadItems = items
      .sort((a,b)=>a.order_index - b.order_index)
      .map((i)=>({
        media_id: i.id, // TEXT path
        order_index: i.order_index,
        duration_sec: i.type === "video" ? 0 : i.duration_sec,
        days_of_week: i.days_of_week.join(","),
        time_start: i.time_start,
        time_end: i.time_end,
      }));

    const res = await fetch("/api/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistName, items: payloadItems, screenIds }),
    });
    const json = await res.json();
    if (!res.ok) { alert(json.error || "Fel vid publicering"); return; }

    // Casta display-url till första skärmen om kopplad
    if (connected) {
      const first = screenIds[0];
      const url = `${location.origin}/display/${first}`;
      const mediaInfo = new window.chrome.cast.media.MediaInfo(url, "text/html");
      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      castSession.loadMedia(request).then(
        () => console.log("✅ Castade display till", castDeviceName),
        (err:any)=> console.error("Cast load error:", err)
      );
    }

    alert("✅ Publicerat!");
    setPreview(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Publicera innehåll</h1>

      {/* Välj skärmar */}
      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--panel)] p-4">
        <div className="mb-2 flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          <div className="font-medium">Välj skärmar</div>
        </div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {screens.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2 hover:bg-[var(--blue-50)]">
              <input type="checkbox" checked={!!selectedScreens[s.id]} onChange={()=>toggleScreen(s.id)} />
              <span className="text-sm">{s.name ?? `Skärm ${s.id.slice(0,6)}`} · {s.orientation==="portrait"?"Lodrät":"Vågrät"}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Chromecast */}
      <div className="flex items-center gap-3">
        <ChromecastButton onCastStart={(session,name)=>{ setCastSession(session); setCastDeviceName(name); }}/>
        {castDeviceName && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--blue-50)] px-3 py-2 text-sm text-[var(--blue-800)] ring-1 ring-[color:var(--line)]">
            <CastIcon className="h-4 w-4" /> Kopplad till: <strong>{castDeviceName}</strong>
          </div>
        )}
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e)=>{e.preventDefault(); setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center ${
          dragOver ? "border-[var(--blue-700)] bg-[var(--blue-50)]" : "border-[color:var(--line)] bg-[var(--panel)]"
        }`}
      >
        <Upload className="mb-3 h-6 w-6" />
        <div className="mb-2 font-medium">Dra & släpp filer här</div>
        <div className="mb-4 text-sm text-[var(--ink-600)]">Bilder och videor stöds. Du kan även klicka för att välja.</div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2 text-sm hover:bg-[var(--blue-50)]">
          Välj filer
          <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUploadInput}/>
        </label>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.slice().sort((a,b)=>a.order_index-b.order_index).map((m,i)=>(
            <div key={m.id} className="grid items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-[var(--panel)] p-3 md:grid-cols-[120px_1fr_auto]">
              <div className="overflow-hidden rounded-lg ring-1 ring-[color:var(--line)]">
                {m.type==="image" ? (
                  <img src={m.url} className="h-24 w-full object-cover"/>
                ) : (
                  <video src={m.url} className="h-24 w-full object-cover" muted />
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-[var(--ink-50)] px-2 py-1 text-xs">{m.type.toUpperCase()}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--ink-700)]">
                    <Clock className="h-3.5 w-3.5"/>{m.type==="video"?"Auto (video)":`${m.duration_sec}s`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <label className="flex items-center gap-1">Start:
                    <input type="time" value={m.time_start} onChange={(e)=>setField(m.id,"time_start",e.target.value)}
                           className="rounded-lg border border-[color:var(--line)] bg-[var(--panel)] px-2 py-1"/>
                  </label>
                  <label className="flex items-center gap-1">Slut:
                    <input type="time" value={m.time_end} onChange={(e)=>setField(m.id,"time_end",e.target.value)}
                           className="rounded-lg border border-[color:var(--line)] bg-[var(--panel)] px-2 py-1"/>
                  </label>
                  {m.type==="image" && (
                    <label className="ml-2 flex items-center gap-1">Längd:
                      <input type="number" min={1} value={m.duration_sec}
                             onChange={(e)=>setField(m.id,"duration_sec",Math.max(1,Number(e.target.value||1)))}
                             className="w-16 rounded-lg border border-[color:var(--line)] bg-[var(--panel)] px-2 py-1"/> s
                    </label>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                  {["Sön","Mån","Tis","Ons","Tor","Fre","Lör"].map((d,idx)=>(
                    <button key={d} onClick={()=>setDays(m.id,idx)}
                            className={`rounded-lg px-2 py-1 ring-1 ring-[color:var(--line)] ${
                              m.days_of_week.includes(idx)
                                ? "bg-[var(--blue-50)] text-[var(--blue-800)]"
                                : "bg-[var(--panel)] text-[var(--ink-700)]"
                            }`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={()=>move(m.id,-1)} disabled={i===0}
                        className="rounded-lg border border-[color:var(--line)] p-2 disabled:opacity-40 hover:bg-[var(--blue-50)]" title="Upp">
                  <ArrowUp className="h-4 w-4"/>
                </button>
                <button onClick={()=>move(m.id,+1)} disabled={i===items.length-1}
                        className="rounded-lg border border-[color:var(--line)] p-2 disabled:opacity-40 hover:bg-[var(--blue-50)]" title="Ner">
                  <ArrowDown className="h-4 w-4"/>
                </button>
                <button onClick={()=>removeItem(m.id)} className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700" title="Ta bort">
                  <Trash2 className="h-4 w-4"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview & Publish */}
      <div className="flex flex-wrap items-center gap-3">
        <input value={playlistName} onChange={(e)=>setPlaylistName(e.target.value)}
               className="w-60 rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
               placeholder="Namn på spellista"/>

        <button onClick={()=>setPreview(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--blue-700)] px-4 py-2 font-medium text-white hover:bg-[var(--blue-600)]">
          <Play className="h-5 w-5"/> Förhandsgranska
        </button>

        <button onClick={handlePublish}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700">
          ✅ Publicera nu
        </button>

        {!preview && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--amber-700)]">
            <AlertTriangle className="h-4 w-4"/> Tips: förhandsgranska gärna innan publicering
          </span>
        )}
      </div>

      {/* Enkel preview-lista */}
      {preview && items.length>0 && (
        <div className="mt-3 rounded-2xl border border-[color:var(--line)] bg-[var(--panel)] p-4">
          {items.slice().sort((a,b)=>a.order_index-b.order_index).map(m =>
            m.type==="image"
              ? <img key={m.id} src={m.url} className="mb-2 w-full rounded-lg ring-1 ring-[color:var(--line)]"/>
              : <video key={m.id} src={m.url} controls className="mb-2 w-full rounded-lg ring-1 ring-[color:var(--line)]"/>
          )}
        </div>
      )}
    </div>
  );
}
