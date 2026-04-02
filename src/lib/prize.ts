import { supabase } from '@/lib/supabaseClient'

// Tier distribution percentages
const TIER_JACKPOT = 0.40   // 5-match winners
const TIER_2 = 0.35         // 4-match winners
const TIER_3 = 0.25         // 3-match winners

export type PrizeBreakdown = {
  totalPool: number
  rolloverIn: number
  finalPool: number
  jackpotPool: number
  tier2Pool: number
  tier3Pool: number
  jackpotCarry: number
  count5: number
  count4: number
  count3: number
  payout5: number
  payout4: number
  payout3: number
}

/**
 * Calculate the total prize pool from active subscriptions.
 */
export async function calculateTotalPool(): Promise<number> {
  const { count, error } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  if (error) console.error('Pool calc error:', error)
  return (count || 0) * 299
}

/**
 * Fetch the jackpot carry (rollover) from the previous month's draw.
 * Returns the carry amount if the previous draw had no 5-match winners.
 */
export async function getJackpotCarry(currentMonth: number, currentYear: number): Promise<number> {
  let prevMonth = currentMonth - 1
  let prevYear = currentYear
  if (prevMonth === 0) {
    prevMonth = 12
    prevYear -= 1
  }

  const { data: prevDraw } = await supabase
    .from('draws')
    .select('id, total_pool, jackpot_carry')
    .eq('month', prevMonth)
    .eq('year', prevYear)
    .eq('status', 'published')
    .single()

  if (!prevDraw) return 0

  // If previous draw stored an explicit jackpot_carry, use it
  if (prevDraw.jackpot_carry && prevDraw.jackpot_carry > 0) {
    return prevDraw.jackpot_carry
  }

  // Fallback: check if previous draw had 5-match winners
  const { count } = await supabase
    .from('winners')
    .select('id', { count: 'exact', head: true })
    .eq('draw_id', prevDraw.id)
    .eq('match_count', 5)

  if (count === 0) {
    // No jackpot winners — carry 40% of their pool
    return prevDraw.total_pool * TIER_JACKPOT
  }

  return 0
}

/**
 * Core prize calculation and distribution engine.
 * Called after winners are inserted into the DB.
 */
export async function calculateAndDistributePrizes(drawId: string): Promise<PrizeBreakdown> {
  // 1. Fetch draw
  const { data: draw, error: drawErr } = await supabase
    .from('draws')
    .select('*')
    .eq('id', drawId)
    .single()

  if (drawErr || !draw) throw new Error('Could not fetch draw for prize calculation.')

  // 2. Calculate pools
  const rolloverIn = await getJackpotCarry(draw.month, draw.year)
  const finalPool = draw.total_pool + rolloverIn

  const jackpotPool = finalPool * TIER_JACKPOT
  const tier2Pool = finalPool * TIER_2
  const tier3Pool = finalPool * TIER_3

  // 3. Count winners per tier
  const { data: winners, error: winErr } = await supabase
    .from('winners')
    .select('id, match_count')
    .eq('draw_id', drawId)

  if (winErr) throw winErr
  const allWinners = winners || []

  const count5 = allWinners.filter(w => w.match_count === 5).length
  const count4 = allWinners.filter(w => w.match_count === 4).length
  const count3 = allWinners.filter(w => w.match_count === 3).length

  // 4. Calculate per-winner payouts
  const payout5 = count5 > 0 ? jackpotPool / count5 : 0
  const payout4 = count4 > 0 ? tier2Pool / count4 : 0
  const payout3 = count3 > 0 ? tier3Pool / count3 : 0

  // 5. Determine jackpot carry for next month
  const jackpotCarry = count5 === 0 ? jackpotPool : 0

  // 6. Update each winner's prize_amount
  for (const w of allWinners) {
    let prize = 0
    if (w.match_count === 5) prize = payout5
    else if (w.match_count === 4) prize = payout4
    else if (w.match_count === 3) prize = payout3

    if (prize > 0) {
      await supabase
        .from('winners')
        .update({ prize_amount: Number(prize.toFixed(2)) })
        .eq('id', w.id)
    }
  }

  // 7. Update draw with financial summary
  await supabase
    .from('draws')
    .update({
      total_pool: finalPool,
      jackpot_carry: jackpotCarry,
    })
    .eq('id', drawId)

  return {
    totalPool: draw.total_pool,
    rolloverIn,
    finalPool,
    jackpotPool,
    tier2Pool,
    tier3Pool,
    jackpotCarry,
    count5,
    count4,
    count3,
    payout5: Number(payout5.toFixed(2)),
    payout4: Number(payout4.toFixed(2)),
    payout3: Number(payout3.toFixed(2)),
  }
}
