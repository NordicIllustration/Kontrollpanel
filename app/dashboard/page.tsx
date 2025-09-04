'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Dashboard() {
  const router = useRouter()
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      // Hämta session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      // Hämta username från profiles baserat på user.id
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single()

      setUsername(profile?.username ?? null)
      setLoading(false)
    })()
  }, [router])

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
        Laddar…
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-[#f5f5f5] p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full bg-[#E30613]" />
            <h1 className="text-xl font-semibold">Kontrollpanel</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/upload"
              className="rounded-xl px-4 py-2 bg-[#151515] border border-[#2a2a2a] hover:border-[#E30613]"
            >
              Ladda upp media
            </a>
            <a
              href="/media"
              className="rounded-xl px-4 py-2 bg-[#151515] border border-[#2a2a2a] hover:border-[#E30613]"
            >
              Mina media
            </a>

            {/* Chromecast-knappen */}
            <google-cast-launcher style={{ width: 36, height: 36 }} />

            <button
              onClick={logout}
              className="rounded-xl px-4 py-2 bg-[#151515] border border-[#2a2a2a] hover:border-[#E30613]"
            >
              Logga ut
            </button>
          </div>
        </header>

        <p className="text-[#a3a3a3] mb-4">
          Inloggad som: {username ?? 'Okänt användarnamn'}
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-[#151515] border border-[#2a2a2a] p-6">Widget 1</div>
          <div className="rounded-2xl bg-[#151515] border border-[#2a2a2a] p-6">Widget 2</div>
          <div className="rounded-2xl bg-[#151515] border border-[#2a2a2a] p-6">Widget 3</div>
        </div>
      </div>
    </main>
  )
}
