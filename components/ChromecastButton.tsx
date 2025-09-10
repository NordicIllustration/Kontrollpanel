"use client";

import React from "react";
import { Cast } from "lucide-react";

declare global {
  interface Window {
    cast?: any;
    chrome?: any;
  }
}

export default function ChromecastButton({
  onCastStart,
}: {
  onCastStart?: (session: any, deviceName: string) => void;
}) {
  const [available, setAvailable] = React.useState(false);
  const [casting, setCasting] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => {
      if (window.cast && window.cast.framework) setAvailable(true);
    }, 800);
    return () => clearInterval(id);
  }, []);

  const startCast = async () => {
    if (!window.cast || !window.cast.framework) return;
    const context = window.cast.framework.CastContext.getInstance();
    context.setOptions({
      receiverApplicationId:
        window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID,
      autoJoinPolicy: window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED,
    });
    try {
      const session = await context.requestSession();
      setCasting(true);

      let name = "Okänd skärm";
      if (session && typeof session.getCastDevice === "function") {
        const dev = session.getCastDevice();
        if (dev && dev.friendlyName) name = dev.friendlyName;
      }

      onCastStart?.(session, name);
    } catch (e: any) {
      if (e === "cancel") {
        console.log("👉 Chromecast-val avbröts av användaren.");
      } else {
        console.error("Cast error:", e);
      }
    }
  };

  return (
    <button
      onClick={startCast}
      disabled={!available}
      className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-medium hover:bg-[var(--blue-50)] disabled:opacity-50"
    >
      <Cast
        className={`h-4 w-4 ${
          casting ? "text-[var(--blue-700)]" : "text-[var(--ink-700)]"
        }`}
      />
      {casting ? "Kopplad" : "Välj Chromecast"}
    </button>
  );
}
