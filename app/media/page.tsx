'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Asset = {
  id: string
  path: string
  mime_type: string | null
  title: string | null
  created_at: string
}

export default function MediaPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [signed, setSigned] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      // 1) Säkerställ inloggning
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }
      setUserId(session.user.id)

      // 2) Hämta användarens assets
      const { data, error } = await supabase
        .from('assets')
        .select('id, path, mime_type, title, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      setAssets(data || [])

      // 3) Skapa signed URLs (1h) för förhandsvisning i listan
      const signedMap: Record<string, string> = {}
      for (const a of data || []) {
        const { data: urlData, error: urlErr } = await supabase
          .storage
          .from('media')
          .createSignedUrl(a.path, 3600)

        if (!urlErr && urlData?.signedUrl) {
          signedMap[a.id] = urlData.signedUrl
        }
      }
      setSigned(signedMap)
      setLoading(false)
    })()
  }, [router])

  const isImage = (mime?: string | null) =>
    mime ? mime.startsWith('image/') : false

  const isVideo = (mime?: string | null) =>
    mime ? mime.startsWith('video/') : false

  // --- Chromecast: spela upp valt media (robust mot olika SDK-versioner) ---
  const castMedia = async (asset: Asset) => {
    const w = window as any
    const cast = w.cast
    const chromeCast = w.chrome?.cast

    const session = cast?.framework?.CastContext
      ?.getInstance()
      ?.getCurrentSession()

    if (!session) {
      alert('Ingen Chromecast ansluten. Klicka på cast-ikonen först.')
      return
    }

    // Skapa en signed URL som håller längre (24h) för uppspelning på TV
    const { data: signedUrlData, error: signedError } = await supabase
      .storage
      .from('media')
      .createSignedUrl(asset.path, 60 * 60 * 24)

    if (signedError || !signedUrlData?.signedUrl) {
      console.error(signedError)
      alert('Kunde inte skapa signed URL för uppspelning.')
      return
    }

    const url = signedUrlData.signedUrl
    const mime = asset.mime_type || 'application/octet-stream'

    // Försök med nya Cast Framework-klasser först...
    const hasFrameworkMediaInfo = !!cast?.framework?.messages?.MediaInfo
    const hasChromeMediaInfo = !!chromeCast?.media?.MediaInfo

    if (hasFrameworkMediaInfo) {
      try {
        const mediaInfo = new cast.framework.messages.MediaInfo(url, mime)
        mediaInfo.metadata = new cast.framework.messages.GenericMediaMetadata()
        mediaInfo.metadata.title = asset.title ?? 'Mediafil'

        const request = new cast.framework.messages.LoadRequestData()
        request.media = mediaInfo
        request.autoplay = true

        session.loadMedia(request).then(
          () => console.log('Cast startad (framework):', asset.title || asset.path),
          (err: any) => {
            console.error('Fel vid cast (framework):', err)
            alert('Fel vid uppspelning på Chromecast.')
          }
        )
        return
      } catch (e) {
        console.warn('Framework load misslyckades, försöker chrome.cast...', e)
      }
    }

    // ...annars fall tillbaka till äldre chrome.cast.media-API
    if (hasChromeMediaInfo) {
      try {
        const mediaInfo = new chromeCast.media.MediaInfo(url, mime)
        const metadata = new chromeCast.media.GenericMediaMetadata()
        metadata.title = asset.title ?? 'Mediafil'
        mediaInfo.metadata = metadata

        const request = new chromeCast.media.LoadRequest(mediaInfo)
        ;(request as any).autoplay = true

        // cast.framework.CastSession -> underliggande sessionobjekt:
        session.getSessionObj().loadMedia(
          request,
          () => console.log('Cast startad (chrome.cast):', asset.title || asset.path),
          (err: any) => {
            console.error('Fel vid cast (chrome.cast):', err)
            alert('Fel vid uppspelning på Chromecast.')
          }
        )
        return
      } catch (e) {
        console.error('Fel även med chrome.cast:', e)
        alert('Kunde inte starta uppspelning (SDK-problem).')
      }
    } else {
      alert('Cast-SDK är inte fullt initialiserad i denna flik.')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
        Laddar media…
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-[#f5f5f5] p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold">Mina media</h1>
          <div className="flex gap-3">
            <a
              href="/upload"
              className="rounded-xl px-4 py-2 bg-[#151515] border border-[#2a2a2a] hover:border-[#E30613]"
            >
              Ladda upp
            </a>
            <a
              href="/dashboard"
              className="rounded-xl px-4 py-2 bg-[#151515] border border-[#2a2a2a] hover:border-[#E30613]"
            >
              Tillbaka
            </a>
          </div>
        </header>

        {assets.length === 0 ? (
          <p className="text-[#a3a3a3]">Inga filer ännu. Gå till “Ladda upp”.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {assets.map((a) => {
              const url = signed[a.id]
              const ext = a.mime_type ?? ''
              return (
                <div
                  key={a.id}
                  className="rounded-2xl bg-[#151515] border border-[#2a2a2a] overflow-hidden"
                >
                  <div className="aspect-video flex items-center justify-center bg-black">
                    {!url ? (
                      <span className="text-sm opacity-60 p-4">
                        Kunde inte skapa URL
                      </span>
                    ) : isImage(ext) ? (
                      <img
                        src={url}
                        alt={a.title ?? a.path}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    ) : isVideo(ext) ? (
                      <video
                        src={url}
                        className="w-full h-full"
                        controls
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <span className="text-sm opacity-60 p-4">Okänt format</span>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="text-sm font-medium truncate">
                      {a.title ?? a.path}
                    </p>
                    <p className="text-xs text-[#a3a3a3] mt-1">
                      {ext || 'okänd typ'}
                    </p>

                    <button
                      onClick={() => castMedia(a)}
                      className="mt-3 w-full rounded bg-blue-600 hover:bg-blue-700 py-2 text-sm font-medium"
                    >
                      Spela på skärm
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
