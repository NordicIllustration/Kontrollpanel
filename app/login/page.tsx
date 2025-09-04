'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { resolveEmailFromUsername } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.replace('/dashboard')
    })()
  }, [router])

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)
    try {
      const email = await resolveEmailFromUsername(usernameOrEmail)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.replace('/dashboard')
    } catch (err: any) {
      setErrorMsg(err.message || 'Inloggning misslyckades')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-[#f5f5f5] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#151515] border border-[#2a2a2a] rounded-2xl shadow-2xl p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[#E30613]" />
          <span className="text-lg tracking-wide text-[#a3a3a3]">Alex Monitor</span>
        </div>

        <h1 className="text-2xl font-semibold mb-2">Logga in</h1>
        <p className="text-sm text-[#a3a3a3] mb-6">
          Endast användarnamn och lösenord. Inga nya konton kan skapas.
        </p>

        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-[#a3a3a3]">Användarnamn</label>
            <input
              className="w-full rounded-xl bg-[#0b0b0b]/80 text-white placeholder-[#a3a3a3] px-4 py-3 border border-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#E30613]"
              placeholder="t.ex. alexm"
              value={usernameOrEmail}
              onChange={(e)=>setUsernameOrEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-[#a3a3a3]">Lösenord</label>
              <button
                type="button"
                onClick={()=>setShowPw(s=>!s)}
                className="text-xs text-[#a3a3a3] hover:text-white"
              >
                {showPw ? 'Dölj' : 'Visa'}
              </button>
            </div>
            <input
              type={showPw ? 'text' : 'password'}
              className="w-full rounded-xl bg-[#0b0b0b]/80 text-white placeholder-[#a3a3a3] px-4 py-3 border border-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-[#E30613]"
              placeholder="••••••••"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
            />
          </div>

          {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 bg-[#E30613] hover:bg-[#c10511] text-white font-medium transition"
          >
            {loading ? 'Loggar in…' : 'Logga in'}
          </button>
        </form>

        <p className="text-xs text-[#a3a3a3] mt-6 text-center">
          Otillåtna försök loggas
        </p>
      </div>
    </main>
  )
}
