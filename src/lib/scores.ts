import { supabase } from '@/lib/supabaseClient'

export type Score = {
  id: string
  user_id: string
  score: number
  played_at: string
  created_at?: string
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

export async function addScore(userId: string, score: number, date: string): Promise<Score> {
  if (score < 1 || score > 45) {
    throw new Error('Score must be between 1 and 45')
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
