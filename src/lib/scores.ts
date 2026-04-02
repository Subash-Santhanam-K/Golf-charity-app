import { supabase } from '@/lib/supabaseClient'

export type Score = {
  id: string
  user_id: string
  score: number
  played_at: string
  created_at?: string
}

/**
 * Check if the current month's tournament is still open for score submissions.
 * Returns { open: true } if submissions are allowed, or { open: false, message } if locked.
 */
export async function checkTournamentOpen(): Promise<{ open: boolean; message?: string }> {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const { data: draw, error } = await supabase
    .from('draws')
    .select('status, published_at, cutoff_date')
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // No draw for this month or table missing → submissions allowed
  if (error || !draw) return { open: true }

  // If draw is published → locked
  if (draw.status === 'published') {
    return {
      open: false,
      message: '⛳ This month\'s tournament has ended. Your next round will count for the upcoming month!'
    }
  }

  // If draw is draft but has a cutoff_date that has passed → locked
  if (draw.cutoff_date && new Date(draw.cutoff_date) < now) {
    return {
      open: false,
      message: '🏁 Score submissions have closed for this draw. Results will be announced soon!'
    }
  }

  return { open: true }
}

export async function getUserScores(userId: string): Promise<Score[]> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(5)

  if (error) {
    if (error.code !== '42P01') console.error('Error fetching scores:', error)
    return []
  }
  
  return data || []
}

/**
 * Fetch scores submitted before a specific cutoff date (for fair winner calculation).
 */
export async function getUserScoresBeforeCutoff(userId: string, cutoffDate: string): Promise<Score[]> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .lte('created_at', cutoffDate)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    if (error.code !== '42P01') console.error('Error fetching pre-cutoff scores:', error)
    return []
  }
  
  return data || []
}

export async function addScore(userId: string, score: number, date: string): Promise<Score> {
  if (score < 1 || score > 45) {
    throw new Error('Score must be between 1 and 45')
  }

  // Tournament lock check
  const tournamentStatus = await checkTournamentOpen()
  if (!tournamentStatus.open) {
    throw new Error(tournamentStatus.message || 'Score submissions are currently closed.')
  }

  const datePrefix = new Date(date).toISOString().split('T')[0]
  
  const { data: existingScores, error: checkError } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (checkError) {
    if (checkError.code !== '42P01') throw checkError
  }

  if (existingScores) {
    const hasDuplicateDate = existingScores.some(s => 
      new Date(s.played_at).toISOString().split('T')[0] === datePrefix
    )
    if (hasDuplicateDate) {
      throw new Error('You already added a score for this date')
    }

    let scoresToKeep = [...existingScores]
    while (scoresToKeep.length >= 5) {
      const oldestScore = scoresToKeep[0]
      const { error: delError } = await supabase
        .from('scores')
        .delete()
        .eq('id', oldestScore.id)
      
      if (delError) throw delError
      scoresToKeep.shift()
    }
  }

  const { data, error } = await supabase
    .from('scores')
    .insert({
      user_id: userId,
      score,
      played_at: new Date(date).toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}
