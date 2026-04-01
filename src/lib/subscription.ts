import { supabase } from '@/lib/supabaseClient'

export async function getUserSubscription(userId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code !== 'PGRST116') console.error('Error fetching subscription:', error)
    return null
  }
  
  if (!data || data.length === 0) return null

  const latest = data[0]
  const isExpired = new Date(latest.end_date) < new Date()
  
  if (isExpired && latest.status === 'active') {
    await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', latest.id)
    latest.status = 'expired'
  }
  
  return latest
}

export async function checkUserSubscription(userId: string) {
  const sub = await getUserSubscription(userId)
  return sub?.status === 'active' ? sub : null
}

export async function getSubscriptionHistory(userId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    
  if (error) console.error('Error fetching subscription history:', error)
  return data || []
}

export async function createSubscription(userId: string, plan: 'monthly' | 'yearly') {
  const activeSub = await checkUserSubscription(userId)
  if (activeSub) {
    throw new Error('You already have an active subscription')
  }

  const startDate = new Date()
  const endDate = new Date(startDate)
  
  if (plan === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1)
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1)
  }
  
  const price = plan === 'monthly' ? 299 : 2999

  const { data, error } = await supabase.from('subscriptions').insert({
    user_id: userId,
    plan,
    status: 'active',
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    price
  }).select().single()

  if (error) throw error
  return data
}
