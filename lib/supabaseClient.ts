// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// Skapa en supabase-klient som använder dina miljövariabler
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
