import { supabase } from '@/lib/supabaseClient'

export type Winner = {
  id: string
  user_id: string
  draw_id: string
  match_count: number
  prize_amount: number
  status: 'pending' | 'approved' | 'rejected'
  payment_status?: 'pending' | 'paid'
  proof_url?: string
  created_at?: string
  draws?: { month: number; year: number; total_pool: number; type: string }
}

/**
 * Get the current user's winner record for the latest draw.
 */
export async function getUserWinner(userId: string, drawId: string): Promise<Winner | null> {
  const { data, error } = await supabase
    .from('winners')
    .select('*')
    .eq('user_id', userId)
    .eq('draw_id', drawId)
    .single()

  if (error && error.code !== 'PGRST116') console.error(error)
  return data || null
}

/**
 * Get all winners (admin view) with user email and draw info.
 */
export async function getAllWinners(): Promise<Winner[]> {
  const { data, error } = await supabase
    .from('winners')
    .select('*, draws(month, year, total_pool, type)')
    .order('created_at', { ascending: false })

  if (error && error.code !== '42P01') console.error(error)
  return data || []
}

/**
 * Upload proof image to Supabase Storage and save URL to winner record.
 */
export async function uploadWinnerProof(winnerId: string, userId: string, file: File): Promise<string> {
  // Validate file
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
    throw new Error('Only PNG and JPEG images are accepted.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File must be smaller than 5MB.')
  }

  const ext = file.name.split('.').pop() || 'png'
  const fileName = `proof-${userId}-${Date.now()}.${ext}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('winner-proofs')
    .upload(fileName, file, { cacheControl: '3600', upsert: false })

  if (uploadError) throw uploadError

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('winner-proofs')
    .getPublicUrl(fileName)

  const proofUrl = urlData.publicUrl

  // Update winner record with proof URL
  const { error: updateError } = await supabase
    .from('winners')
    .update({ proof_url: proofUrl })
    .eq('id', winnerId)

  if (updateError) throw updateError

  return proofUrl
}

/**
 * Admin: update winner approval status.
 */
export async function updateWinnerStatus(winnerId: string, status: 'approved' | 'rejected') {
  const { error } = await supabase
    .from('winners')
    .update({ status })
    .eq('id', winnerId)

  if (error) throw error
}

/**
 * Admin: mark winner as paid.
 */
export async function markWinnerPaid(winnerId: string) {
  const { error } = await supabase
    .from('winners')
    .update({ payment_status: 'paid' })
    .eq('id', winnerId)

  if (error) throw error
}
