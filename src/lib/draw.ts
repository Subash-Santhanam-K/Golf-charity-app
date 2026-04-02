import { supabase } from '@/lib/supabaseClient'
import { getUserScoresBeforeCutoff } from '@/lib/scores'
import { calculateAndDistributePrizes } from '@/lib/prize'

// 1. Generation Core
export function generateRandomDraw(exclude: number[] = [], required = 5): number[] {
  const draw = new Set<number>(exclude)
  while (draw.size < exclude.length + required) {
    const randomNum = Math.floor(Math.random() * 45) + 1
    draw.add(randomNum)
  }
  return Array.from(draw)
}

export async function generateWeightedDraw(): Promise<number[]> {
  const { data, error } = await supabase.from('scores').select('score')
  if (error || !data || data.length === 0) {
    return generateRandomDraw()
  }

  const frequencies: Record<number, number> = {}
  data.forEach((row) => {
    frequencies[row.score] = (frequencies[row.score] || 0) + 1
  })

  const sortedScores = Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1])
    .map(entry => Number(entry[0]))

  let draw = sortedScores.slice(0, 5)

  if (draw.length < 5) {
    draw = generateRandomDraw(draw, 5 - draw.length)
  }

  return draw
}

export async function createDrawSimulation(month: number, year: number, type: 'random' | 'algorithm') {
  // Enforce one draw per month/year
  const { data: existing } = await supabase
    .from('draws')
    .select('id')
    .eq('month', month)
    .eq('year', year)
    .single()

  if (existing) {
    throw new Error('A draw has already been initiated for this exact month and year.')
  }

  const draw_numbers = type === 'random' ? generateRandomDraw() : await generateWeightedDraw()

  // Calc pool: (active users * 299)
  const { count } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  const totalPool = (count || 0) * 299

  // Set cutoff_date to NOW
  const cutoffDate = new Date().toISOString()

  const { data, error } = await supabase.from('draws').insert({
    month,
    year,
    draw_numbers,
    type,
    status: 'draft',
    total_pool: totalPool,
    cutoff_date: cutoffDate,
    jackpot_carry: 0,
  }).select().single()

  if (error) throw error
  return data
}

export function calculateMatches(userScores: number[], drawNumbers: number[]) {
  const drawSet = new Set(drawNumbers)
  return userScores.filter(score => drawSet.has(score)).length
}

export async function publishDraw(drawId: string) {
  // 1. Fetch Draft safely
  const { data: draw, error: fetchError } = await supabase
    .from('draws')
    .select('*')
    .eq('id', drawId)
    .single()

  if (fetchError) throw fetchError
  if (draw.status === 'published') {
    throw new Error('This draw has already been published. Double publishing is prevented.')
  }

  // 2. Fetch all users
  const { data: users, error: userError } = await supabase.from('users').select('id')
  if (userError || !users) throw new Error('Failed to fetch user list for draw resolution')

  const winnersPayload: any[] = []
  const userMatches: { userId: string; matches: number }[] = []

  // Use the cutoff_date for fair snapshot calculation
  const cutoffDate = draw.cutoff_date || draw.created_at

  // 3. Analyze ONLY pre-cutoff scores for each user (SNAPSHOT)
  for (const user of users) {
    const scoresDocs = await getUserScoresBeforeCutoff(user.id, cutoffDate)
    if (scoresDocs.length === 0) continue

    const activeScores = scoresDocs.map(s => s.score)
    const matches = calculateMatches(activeScores, draw.draw_numbers)

    if (matches >= 3) {
      userMatches.push({ userId: user.id, matches })
    }
  }

  // 4. Insert winners (prize_amount = 0 placeholder, will be set by prize engine)
  userMatches.forEach(win => {
    winnersPayload.push({
      user_id: win.userId,
      draw_id: draw.id,
      match_count: win.matches,
      prize_amount: 0,
      status: 'pending',
    })
  })

  if (winnersPayload.length > 0) {
    const { error: insertError } = await supabase.from('winners').insert(winnersPayload)
    if (insertError) throw insertError
  }

  // 5. Close Status with published_at timestamp
  const { error: updateError } = await supabase
    .from('draws')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', draw.id)

  if (updateError) {
    throw new Error('Critical: Winners saved but draw status update failed.')
  }

  // 6. Run prize distribution engine (calculates payouts + stores jackpot_carry)
  const prizeBreakdown = await calculateAndDistributePrizes(drawId)

  return { winnersCount: winnersPayload.length, complete: true, prizeBreakdown }
}

export async function getLatestDraw() {
  const { data, error } = await supabase
    .from('draws')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
    
  if (error && error.code !== 'PGRST116') console.error(error)
  return data || null
}

export async function getUserWinnings(userId: string) {
  const { data, error } = await supabase
    .from('winners')
    .select('*, draws(month, year, total_pool, type)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) console.error(error)
  return data || []
}
