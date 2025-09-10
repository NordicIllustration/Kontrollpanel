"use client";

import React, { useEffect, useRef, useState } from "react";

type Item = {
  id: string;
  media_id: string;                 // t.ex. "uploads/clip.mp4" eller full https-länk
  type?: "video" | "image";
  duration_seconds?: number;
  orientation?: "landscape" | "portrait";
};

type PlaylistResponse =
  | { ok: true; items: any[] }
  | { ok: false; error: string; details?: string };

export default function DisplayClient({ screenId }: { screenId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/playlist/${screenId}`, { cache: "no-store" });
        const json: PlaylistResponse = await res.json();

        if (!res.ok || !("ok" in json) || json.ok === false) {
          throw new Error(
            (json as any)?.error || (json as any)?.details || "Kunde inte hämta spellista."
          );
        }

        const rawItems = (json.items ?? []) as any[];

        const normalized: Item[] = rawItems
          .map(normalizeItem)
          .filter((x): x is Item => !!x);

        if (!normalized.length) {
          throw new Error(
            "Spellistan saknar giltiga media-länkar. Säkerställ att items innehåller `media_id`/`mediaId`/`url`."
          );
        }

        if (!cancelled) {
          setItems(normalized);
          setIdx(0);
          setMsg(null);
        }
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message || "Kunde inte hämta spellista.");
      }
    }

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [screenId]);

  useEffect(() => {
    if (!items.length) return;
    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => {
      if (items.length > 1) setIdx((p) => (p + 1) % items.length);
    };
    const onError = () => {
      flash("Ogiltig media – hoppar vidare…");
      jumpNextSoon();
    };

    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    return () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, idx]);

  useEffect(() => {
    if (!items.length) return;
    const current = items[idx];
    if (current?.type === "image") {
      if (timerRef.current) clearTimeout(timerRef.current);
      const dur = Math.max(1, current.duration_seconds ?? 8);
      timerRef.current = setTimeout(() => {
        setIdx((p) => (p + 1) % items.length);
      }, dur * 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [items, idx]);

  function jumpNextSoon() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIdx((p) => (p + 1) % items.length);
    }, 1000);
  }

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 2000);
  }

  if (!items.length) {
    return (
      <FullBlack>
        <Info text={msg || "Laddar media…"} />
      </FullBlack>
    );
  }

  const current = items[idx];
  const isVideo = current.type === "video";
  const isSingle = items.length === 1;

  const url = toPublicUrl(current.media_id);
  if (!url) {
    return (
      <FullBlack>
        <Info text="Saknar giltig media-URL i item – kontrollera 'media_id'." />
      </FullBlack>
    );
  }

  return (
    <FullBlack>
      {isVideo ? (
        <video
          key={current.id}
          ref={videoRef}
          src={url}
          autoPlay
          muted
          loop={isSingle}
          playsInline
          preload="auto"
          disablePictureInPicture
          controls={false}
          style={{
            width: "100vw",
            height: "100vh",
            objectFit: "contain",
            background: "black",
          }}
        />
      ) : (
        <img
          key={current.id}
          src={url}
          alt=""
          onError={() => {
            flash("Ogiltig media – hoppar vidare…");
            jumpNextSoon();
          }}
          style={{
            width: "100vw",
            height: "100vh",
            objectFit: "contain",
            background: "black",
          }}
        />
      )}

      {msg && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: "8vh",
            textAlign: "center",
            color: "rgba(255,255,255,0.9)",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
            fontSize: 18,
          }}
        >
          {msg}
        </div>
      )}
    </FullBlack>
  );
}

/* ---------- Helpers ---------- */

function normalizeItem(raw: any): Item | null {
  const path: unknown =
    raw?.media_id ?? raw?.mediaId ?? raw?.media ?? raw?.url ?? raw?.path;

  if (!path || typeof path !== "string") {
    return null; // skip trasiga rader
  }

  // bestäm typ från filändelsen om type saknas
  let type: Item["type"] = raw?.type;
  const ext = path.includes(".") ? path.toLowerCase().split(".").pop() : undefined;
  if (!type) {
    if (ext && ["mp4", "mov", "m4v", "webm"].includes(ext)) type = "video";
    else if (ext && ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) type = "image";
  }

  const duration =
    Number(raw?.duration_seconds ?? raw?.durationSec ?? raw?.duration) || undefined;

  return {
    id: String(raw?.id ?? path),
    media_id: path,
    type,
    duration_seconds: duration,
    orientation: raw?.orientation,
  };
}

function toPublicUrl(storagePath: string): string {
  if (!storagePath) return "";
  // redan en http(s)-URL?
  if (/^https?:\/\//i.test(storagePath)) return storagePath;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "media";
  const p = storagePath.replace(/^\/+/, ""); // ta bort ledande slashar

  // Om vägen redan inkluderar bucket
  if (p.toLowerCase().startsWith(`${bucket.toLowerCase()}/`)) {
    return `${base}/storage/v1/object/public/${p}`;
  }
  return `${base}/storage/v1/object/public/${bucket}/${p}`;
}

function FullBlack({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "black",
        overflow: "hidden",
        cursor: "none",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

function Info({ text }: { text: string }) {
  return (
    <div
      style={{
        color: "rgba(255,255,255,0.8)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        fontSize: 18,
        textAlign: "center",
        position: "absolute",
        left: 0,
        right: 0,
        top: "45vh",
      }}
    >
      {text}
    </div>
  );
}
