"use client";

import * as React from "react";

type Item = {
  id: string;
  type: "image" | "video";
  url: string;
  duration?: number; // sekunder för bilder
};

export default function DisplayClient({ screenId }: { screenId: string }) {
  const [items, setItems] = React.useState<Item[]>([]);
  const [idx, setIdx] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  // Hämta playlist
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/playlist/${screenId}`, { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        const list: Item[] = data?.items ?? [];
        setItems(list);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [screenId]);

  // Heartbeat var 45s
  React.useEffect(() => {
    const post = () =>
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenId }),
      }).catch(() => {});
    post();
    const t = setInterval(post, 45_000);
    return () => clearInterval(t);
  }, [screenId]);

  // Gå fullscreen automatiskt när användaren ger första input (krav i vissa miljöer)
  React.useEffect(() => {
    const goFs = async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      } catch {}
    };
    const onAny = () => goFs();
    window.addEventListener("click", onAny, { once: true });
    window.addEventListener("keydown", onAny, { once: true });
    return () => {
      window.removeEventListener("click", onAny);
      window.removeEventListener("keydown", onAny);
    };
  }, []);

  // Render
  if (loading) {
    return (
      <div className="h-screen w-screen bg-black text-white grid place-items-center">
        <div>Laddar…</div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="h-screen w-screen bg-black text-white grid place-items-center">
        <div>Ingen aktiv spellista för denna skärm</div>
      </div>
    );
  }

  const current = items[idx];

  return (
    <div
      className="h-screen w-screen bg-black overflow-hidden"
      style={{
        display: "grid",
        placeItems: "center",
      }}
    >
      {current.type === "image" ? (
        <ImageSlide
          key={current.id}
          src={current.url}
          duration={current.duration ?? 8}
          onDone={() => setIdx((i) => (i + 1) % items.length)}
        />
      ) : (
        <VideoSlide
          key={current.id}
          src={current.url}
          onDone={() => setIdx((i) => (i + 1) % items.length)}
        />
      )}
    </div>
  );
}

function ImageSlide({
  src,
  duration,
  onDone,
}: {
  src: string;
  duration: number;
  onDone: () => void;
}) {
  React.useEffect(() => {
    const t = setTimeout(onDone, duration * 1000);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  return (
    <img
      src={src}
      alt=""
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain",
        backgroundColor: "black",
      }}
    />
  );
}

function VideoSlide({ src, onDone }: { src: string; onDone: () => void }) {
  return (
    <video
      autoPlay
      muted
      playsInline
      onEnded={onDone}
      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", background: "black" }}
      src={src}
    />
  );
}
