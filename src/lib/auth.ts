import { supabase } from '@/lib/supabaseClient'

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
