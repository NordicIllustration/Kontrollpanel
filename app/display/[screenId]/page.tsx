'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

type ApiItem = {
  id: string;
  mediaId?: string;      // från API:t
  media_id?: string;     // ifall API:t returnerar DB-namnet
  orientation?: 'landscape' | 'portrait' | string;
  durationSeconds?: number;
  time_start?: string | null;
  time_end?: string | null;
  position?: number;
  // ev. fler fält spelar ingen roll här
};

type ApiResponse = {
  ok: boolean;
  items?: ApiItem[];
  error?: string;
  details?: string;
};

function buildPublicUrl(storagePath: string): string {
  // Om det redan är en full URL (http/https) -> returnera som den är.
  if (/^https?:\/\//i.test(storagePath)) return storagePath;

  const root = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const bucket =
    (process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'media').replace(/^\/+|\/+$/g, '');

  // Ta bort ev. ledande snedstreck för att undvika dubbla
  const cleanPath = storagePath.replace(/^\/+/, '');

  // Supabase public URL-format
  return `${root}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

function detectTypeFromPath(path: string): 'video' | 'image' {
  const p = path.toLowerCase();
  if (p.endsWith('.mp4') || p.endsWith('.webm') || p.endsWith('.mov')) return 'video';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.png') || p.endsWith('.gif'))
    return 'image';
  // default – behandla som video
  return 'video';
}

export default function DisplayPage() {
  const { screenId } = useParams<{ screenId: string }>();

  const [items, setItems] = useState<ApiItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Ladda spellista
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/playlist/${screenId}`, { cache: 'no-store' });
        const data: ApiResponse = await res.json();

        if (!data.ok) {
          console.error('Playlist API error:', data.error, data.details);
          setItems([]);
          setLoading(false);
          return;
        }

        const raw = data.items || [];
        // Normalisera fält (mediaId / media_id)
        const norm = raw
          .map((it) => {
            const mediaPath = it.mediaId || it.media_id;
            if (!mediaPath) return null;

            return {
              ...it,
              mediaId: mediaPath, // säkerställ att vi använder "mediaId"
              _publicUrl: buildPublicUrl(mediaPath),
              _type: detectTypeFromPath(mediaPath),
            };
          })
          .filter(Boolean) as (ApiItem & { _publicUrl: string; _type: 'video' | 'image' })[];

        if (alive) {
          setItems(norm);
          setIdx(0);
        }
      } catch (e) {
        console.error('Load playlist failed:', e);
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (screenId) load();

    return () => {
      alive = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [screenId]);

  // Byt automatiskt (om duration finns), annars stanna på första
  useEffect(() => {
    if (!items.length) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const current = items[idx];
    const dur = current?.durationSeconds && current.durationSeconds > 0 ? current.durationSeconds : 15;

    timerRef.current = setTimeout(() => {
      setIdx((p) => (p + 1) % items.length);
    }, dur * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [items, idx]);

  // Render
  if (loading) {
    return (
      <div
        style={{
          background: 'black',
          color: '#aaa',
          width: '100vw',
          height: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Läser in…
      </div>
    );
  }

  if (!items.length) {
    return (
      <div
        style={{
          background: 'black',
          color: '#aaa',
          width: '100vw',
          height: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Ingen aktiv spellista för denna skärm.
      </div>
    );
  }

  const current = items[idx] as ApiItem & { _publicUrl: string; _type: 'video' | 'image' };
  const orientation = (current.orientation || 'landscape').toLowerCase() as 'landscape' | 'portrait';

  const container: React.CSSProperties = {
    background: 'black',
    width: '100vw',
    height: '100vh',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
  };

  const mediaStyle: React.CSSProperties =
    orientation === 'portrait'
      ? {
          height: '100vh',
          width: 'auto',
          maxHeight: '100vh',
          maxWidth: '56.25vh', // 9:16
          objectFit: 'contain',
          background: 'black',
        }
      : {
          width: '100vw',
          height: 'auto',
          maxWidth: '100vw',
          maxHeight: '100vh',
          objectFit: 'contain',
          background: 'black',
        };

  // Debug i konsolen
  // @ts-ignore
  if (typeof window !== 'undefined') window.__currentMedia = current;

  const onError = (e: any) => {
    console.error('Media error on URL:', current._publicUrl, e);
    // Hoppa vidare om något strular
    setIdx((p) => (p + 1) % items.length);
  };

  return (
    <div style={container}>
      {current._type === 'image' ? (
        <img src={current._publicUrl} style={mediaStyle} onError={onError} alt="" />
      ) : (
        <video
          key={current._publicUrl}
          src={current._publicUrl}
          style={mediaStyle}
          autoPlay
          muted
          playsInline
          controls={false}
          loop={false}
          onError={onError}
          onEnded={() => setIdx((p) => (p + 1) % items.length)}
        />
      )}
      {/* Liten overlay för felsökning – ta bort om du vill */}
      <div
        style={{
          position: 'fixed',
          left: 8,
          bottom: 8,
          color: '#888',
          fontSize: 12,
          fontFamily: 'monospace',
          userSelect: 'none',
        }}
      >
        {current._type.toUpperCase()} · {orientation} · {idx + 1}/{items.length}
      </div>
    </div>
  );
}

