'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation' // <— App Router
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  // Om redan inloggad: skicka till dashboard
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.replace('/dashboard')
    }
    check()
  }, [router])

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (!error) setSent(true)
    else alert(error.message)
  }

  return (
    <main style={{maxWidth:480,margin:'40px auto',fontFamily:'sans-serif'}}>
      <h1>Logga in</h1>
      {sent ? (
        <p>Kolla din e-post för magisk länk ✉️</p>
      ) : (
        <form onSubmit={sendLink}>
          <input
            type="email"
            placeholder="din@mail.com"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            style={{width:'100%',padding:12,margin:'8px 0'}}
            required
          />
          <button type="submit" style={{padding:12}}>Skicka länk</button>
        </form>
      )}
    </main>
  )
}

