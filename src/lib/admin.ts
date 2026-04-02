import { supabase } from '@/lib/supabaseClient'

export type AdminUser = {
  id: string
  email?: string
  role: string
  subscription_status?: string
}

export type AdminCharity = {
  id: string
  name: string
  short_description: string
  impact_preview: string
  image_url: string
  why_matters: string
}

/**
 * Fetch all users with their subscription status.
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, role')
    .order('created_at', { ascending: false })

  if (error && (error as any).code !== '42P01') console.error(error)
  if (!users) return []

  // Fetch subscriptions to match
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id, status')

  const subMap: Record<string, string> = {}
  ;(subs || []).forEach((s: any) => { subMap[s.user_id] = s.status })

  return users.map((u: any) => ({
    id: u.id,
    email: u.email || undefined,
    role: u.role || 'user',
    subscription_status: subMap[u.id] || 'inactive',
  }))
}

/**
 * Fetch all charities from the charities table.
 */
export async function getAdminCharities(): Promise<AdminCharity[]> {
  const { data, error } = await supabase
    .from('charities')
    .select('*')
    .order('created_at', { ascending: false })

  if (error && (error as any).code !== '42P01') console.error(error)
  return (data as AdminCharity[]) || []
}

/**
 * Create a new charity.
 */
export async function createCharity(charity: Omit<AdminCharity, 'id'>) {
  const { data, error } = await supabase
    .from('charities')
    .insert(charity)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update an existing charity.
 */
export async function updateCharity(id: string, updates: Partial<AdminCharity>) {
  const { error } = await supabase
    .from('charities')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

/**
 * Delete a charity by ID.
 */
export async function deleteCharity(id: string) {
  const { error } = await supabase
    .from('charities')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Fetch admin dashboard stats.
 */
export async function getAdminStats() {
  const [usersRes, subsRes, winnersRes] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('winners').select('id', { count: 'exact', head: true }),
  ])

  return {
    totalUsers: usersRes.count || 0,
    activeSubscribers: subsRes.count || 0,
    totalWinners: winnersRes.count || 0,
  }
}
