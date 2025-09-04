import { supabase } from './supabaseClient'

export async function resolveEmailFromUsername(usernameOrEmail: string) {
  const v = usernameOrEmail.trim()
  if (v.includes('@')) return v
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('username', v)
    .maybeSingle()
  if (error || !data) throw new Error('Användarnamnet finns inte')
  return data.email
}
