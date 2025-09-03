'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  const [email, setEmail] = useState('')

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOtp({ email })
    console.log(data, error)
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Logga in</h1>
      <input 
        type="email" 
        placeholder="Skriv din email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleLogin}>Skicka magisk länk</button>
    </main>
  )
}
