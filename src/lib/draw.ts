import { supabase } from '@/lib/supabaseClient'
import { getUserScores } from '@/lib/scores'

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

  // Count frequencies
  const frequencies: Record<number, number> = {}
  data.forEach((row) => {
    frequencies[row.score] = (frequencies[row.score] || 0) + 1
  })

  // Sort by highest frequency
  const sortedScores = Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1])
    .map(entry => Number(entry[0]))

  let draw = sortedScores.slice(0, 5)

  // Fill array safely sequentially if less than 5 distinct numbers exist
  if (draw.length < 5) {
    draw = generateRandomDraw(draw, 5 - draw.length)
  }

  return draw
}

export async function createDrawSimulation(month: number, year: number, type: 'random' | 'algorithm') {
  // Enforce one draw per month/year
  const { data: existing, error: fetchErr } = await supabase
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
  const { count, error: countErr } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  const totalPool = (count || 0) * 299

  const { data, error } = await supabase.from('draws').insert({
    month,
    year,
    draw_numbers,
    type,
    status: 'draft',
    total_pool: totalPool
  }).select().single()

  if (error) throw error
  return data
}

export async function getRolloverAmount(currentMonth: number, currentYear: number) {
  let prevMonth = currentMonth - 1
  let prevYear = currentYear
  if (prevMonth === 0) {
    prevMonth = 12
    prevYear -= 1
  }

  const { data, error } = await supabase
    .from('draws')
    .select('id, total_pool')
    .eq('month', prevMonth)
    .eq('year', prevYear)
    .eq('status', 'published')
    .single()

  if (!data) return 0 // no previous draw -> zero rollover

  // Check if it had 5-match winners
  const { count } = await supabase
    .from('winners')
    .select('id', { count: 'exact', head: true })
    .eq('draw_id', data.id)
    .eq('match_count', 5)

  if (count === 0) {
    // Return 40% of previous total_pool
    return data.total_pool * 0.4
  }

  return 0
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

  const rollover = await getRolloverAmount(draw.month, draw.year)
  const finalPool = draw.total_pool + rollover

  // Pricing Matrix (Total distributed equally per respective winners block)
  const jackpotPool = finalPool * 0.40
  const tier2Pool = finalPool * 0.35
  const tier3Pool = finalPool * 0.25

  // 2. Fetch all users
  const { data: users, error: userError } = await supabase.from('users').select('id')
  if (userError || !users) throw new Error('Failed to fetch user list for draw resolution')

  const winnersPayload: any[] = []
  
  // Track counts
  let count5 = 0
  let count4 = 0
  let count3 = 0
  
  const userMatches: { userId: string, matches: number }[] = []

  // Analyze all user profiles via latest 5 scores
  for (const user of users) {
    const scoresDocs = await getUserScores(user.id)
    if (scoresDocs.length === 0) continue

    const activeScores = scoresDocs.map(s => s.score)
    const matches = calculateMatches(activeScores, draw.draw_numbers)

    if (matches >= 3) {
      userMatches.push({ userId: user.id, matches })
      if (matches === 5) count5++
      else if (matches === 4) count4++
      else if (matches === 3) count3++
    }
  }

  // Assign pricing accurately based on the tier block 
  // Safety bounds: if pool distributes to zero winners, the cash offsets silently except 5-match via DB history
  const payout5 = count5 > 0 ? (jackpotPool / count5) : 0
  const payout4 = count4 > 0 ? (tier2Pool / count4) : 0
  const payout3 = count3 > 0 ? (tier3Pool / count3) : 0

  userMatches.forEach(win => {
    let prize = 0
    if (win.matches === 5) prize = payout5
    else if (win.matches === 4) prize = payout4
    else if (win.matches === 3) prize = payout3

    winnersPayload.push({
      user_id: win.userId,
      draw_id: draw.id,
      match_count: win.matches,
      prize_amount: Number(prize.toFixed(2)),
      status: 'pending'
    })
  })

  // 3. Batch Safe Insert (Avoids partial multi-call logic failure)
  if (winnersPayload.length > 0) {
    const { error: insertError } = await supabase.from('winners').insert(winnersPayload)
    if (insertError) throw insertError
  }

  // 4. Close Status
  const { error: updateError } = await supabase
    .from('draws')
    .update({ status: 'published' })
    .eq('id', draw.id)

  if (updateError) {
    // If status update fails entirely after inserting winners, this is a minor split. 
    // In standard environments we'd RPC rollback. For now, throw explicitly.
    throw new Error('Critical: Winners saved but draw status update failed.')
  }

  return { winnersCount: winnersPayload.length, complete: true }
}

export async function getLatestDraw() {
  const { data, error } = await supabase
    .from('draws')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
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
