'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function UploadPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
    })()
  }, [])

  const onSelectFiles = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const files = evt.target.files
    if (!files || !userId) return
    setUploading(true)
    setStatus('Laddar upp...')

    try {
      for (const file of Array.from(files)) {
        // Skapa en unik sökväg per användare
        const filename = `${Date.now()}-${file.name}`
        const path = `user-${userId}/${filename}`

        // 1) Ladda upp till Storage
        const { error: uploadError } = await supabase
          .storage
          .from('media')
          .upload(path, file, { contentType: file.type, upsert: false })

        if (uploadError) throw uploadError

        // 2) Spara metadata i assets
        await supabase.from('assets').insert({
          user_id: userId,
          path,
          mime_type: file.type,
          title: file.name
        })
      }
      setStatus('Klart! ✅')
    } catch (err: any) {
      console.error(err)
      setStatus(`Fel: ${err.message ?? 'okänt fel'}`)
    } finally {
      setUploading(false)
    }
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
        Du måste vara inloggad för att ladda upp.
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-[#f5f5f5] p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Ladda upp media</h1>

        <label className="block rounded-2xl bg-[#151515] border border-[#2a2a2a] p-6 cursor-pointer hover:border-[#E30613]">
          <p className="mb-2">Välj bilder eller videor (flera går bra)</p>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={onSelectFiles}
            className="hidden"
          />
          <span className="inline-block mt-2 text-sm opacity-70">
            Stöder t.ex. .jpg, .png, .mp4
          </span>
        </label>

        <div className="mt-4 text-sm text-[#a3a3a3]">
          {uploading ? 'Laddar upp...' : status}
        </div>
      </div>
    </main>
  )
}
