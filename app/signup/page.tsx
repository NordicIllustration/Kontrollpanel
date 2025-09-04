'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SignUpPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    // 1) Skapa auth-user
    const { data: signUp, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    })
    if (signUpError || !signUp.user) {
      setErrorMsg(signUpError?.message || 'Kunde inte skapa konto')
      setLoading(false)
      return
    }

    // 2) Skapa profilrad (username → email)
    const { error: profileError } = await supabase.from('profiles').insert({
      id: signUp.user.id,
      username,
      email
    })
    if (profileError) {
      setErrorMsg(profileError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    router.replace('/login')
  }

  return (
    <main className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-neutral-800/60 backdrop-blur rounded-2xl shadow-xl p-8 border border-neutral-700">
        <h1 className="text-2xl font-semibold text-white mb-6">Skapa konto</h1>
        <form onSubmit={onSignUp} className="space-y-4">
          <input
            className="w-full rounded-xl bg-neutral-900 text-white placeholder-neutral-400 px-4 py-3 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Användarnamn"
            value={username}
            onChange={(e)=>setUsername(e.target.value)}
            required
          />
          <input
            type="email"
            className="w-full rounded-xl bg-neutral-900 text-white placeholder-neutral-400 px-4 py-3 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="E-post"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full rounded-xl bg-neutral-900 text-white placeholder-neutral-400 px-4 py-3 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Lösenord"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
          />
          {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition"
          >
            {loading ? 'Skapar…' : 'Skapa konto'}
          </button>
          <p className="text-neutral-400 text-sm text-center">
            Har du redan konto? <a href="/login" className="text-indigo-400 hover:underline">Logga in</a>
          </p>
        </form>
      </div>
    </main>
  )
}
