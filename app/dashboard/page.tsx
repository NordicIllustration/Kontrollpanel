'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Dashboard() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }
      setEmail(session.user.email ?? null)
      setLoading(false)
    }
    run()
  }, [router])

  if (loading) return <main style={{padding:20}}>Laddar…</main>

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <main style={{padding:20}}>
      <h1>Dashboard</h1>
      <p>Inloggad som: {email}</p>
      <button onClick={logout}>Logga ut</button>
    </main>
  )
}
