'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getSession } from '@/lib/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { addScore, getUserScores, Score } from '@/lib/scores'
import { getAvailableCharities, setUserCharity, getUserCharitySelection, getGlobalImpact } from '@/lib/charity'
import { getLatestDraw } from '@/lib/draw'
import { useToast } from '@/hooks/useToast'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'

export default function DashboardPage() {
  const router = useRouter()
  const { showToast } = useToast()
  
  const [user, setUser] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  
  // Scores
  const [scores, setScores] = useState<Score[]>([])
  const [scoreInput, setScoreInput] = useState<number | ''>('')
  const [isSubmittingScore, setIsSubmittingScore] = useState(false)
  
  // Charities
  const [availableCharities, setAvailableCharities] = useState<any[]>([])
  const [selectedCharity, setSelectedCharity] = useState('')
  const [percentage, setPercentage] = useState<number>(30)
  const [isSubmittingCharity, setIsSubmittingCharity] = useState(false)
  const [totalImpact, setTotalImpact] = useState(0)

  // Tournament (Draw)
  const [latestDraw, setLatestDraw] = useState<any>(null)

  useEffect(() => {
    let active = true
    const initData = async () => {
      try {
        const session = await getSession()
        if (!session) {
          if (active) router.push('/login')
          return
        }

        const [fetchedScores, charitiesInfo, charSel, impactVal, draw] = await Promise.all([
          getUserScores(session.user.id),
          getAvailableCharities(),
          getUserCharitySelection(session.user.id),
          getGlobalImpact(),
          getLatestDraw()
        ])

        if (active) {
          setUser(session.user)
          setScores(fetchedScores)
          setAvailableCharities(charitiesInfo)
          setTotalImpact(impactVal)
          setLatestDraw(draw)
          
          if (charSel && charSel.charity_id) {
            setSelectedCharity(charSel.charity_id)
            setPercentage(charSel.percentage || 30)
          } else if (charitiesInfo.length > 0) {
              setSelectedCharity(charitiesInfo[0].id)
          }

          setIsInitializing(false)
        }
      } catch (err) {
         if (active) router.push('/login')
      }
    }
    initData()
    return () => { active = false }
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleAddScore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || scoreInput === '' || scoreInput < 1 || scoreInput > 45) {
      if (scoreInput !== '' && (scoreInput < 1 || scoreInput > 45)) {
        showToast({ type: 'error', message: 'Score must be between 1 and 45 🎯' })
      }
      return
    }
    setIsSubmittingScore(true)
    try {
      await addScore(user.id, scoreInput, new Date().toISOString())
      const updated = await getUserScores(user.id)
      setScores(updated)
      setScoreInput('')
      showToast({ type: 'success', message: 'Score saved! Keep swinging ⛳' })
    } catch(err: any) {
      const msg = err.message || 'Something went wrong. Please try again.'
      if (msg.includes('already')) {
        showToast({ type: 'error', message: 'You already played this round today ⛳' })
      } else {
        showToast({ type: 'error', message: msg })
      }
    }
    setIsSubmittingScore(false)
  }

  const handleSaveCharity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedCharity) return
    setIsSubmittingCharity(true)
    try {
      await setUserCharity(user.id, selectedCharity, percentage)
      showToast({ type: 'success', message: 'Impact preferences secured 🌟' })
    } catch(err: any) {
      showToast({ type: 'error', message: err.message || 'Oops! Something went wrong 😅' })
    }
    setIsSubmittingCharity(false)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-golf-texture">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  // Derived Match State
  const drawNums = latestDraw?.status === 'published' ? latestDraw.draw_numbers : []
  const userScoreValues = scores.map(s => s.score)
  const matches = drawNums.filter((n: number) => userScoreValues.includes(n))
  
  let payout = 0
  if (latestDraw?.status === 'published') {
     if (matches.length === 3) payout = latestDraw.total_pool * 0.40 / 100 // Example division
     if (matches.length === 4) payout = latestDraw.total_pool * 0.35 / 30
     if (matches.length === 5) payout = latestDraw.total_pool * 0.25 / 5
  }

  return (
    <div className="min-h-screen p-6 bg-golf-texture">
      <OnboardingModal />
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-between glass-card p-6 space-y-4 sm:space-y-0"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">🚩</div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">Your Monthly Round</h1>
              <p className="text-slate-500 font-medium">Manage your impacts and tournament entries.</p>
            </div>
          </div>
          <button 
             onClick={handleSignOut}
             className="px-5 py-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-bold text-slate-700 w-full sm:w-auto"
          >
            Sign Out
          </button>
        </motion.div>

        {/* Global Impact Banner */}
        <motion.div 
           initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
           className="glass-card p-8 text-center border-t-4 border-t-green-400"
        >
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-widest text-sm mb-2">Community Impact</h2>
            <div className="flex justify-center items-center gap-2">
               <p className="text-5xl font-extrabold text-green-500 tracking-tight">₹{totalImpact.toLocaleString()}</p>
            </div>
            <p className="text-slate-500 font-bold mt-2">raised globally this month. You played. Someone smiled ❤️</p>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Your Rounds (Score Management) */}
          <motion.div variants={itemVariants} className="glass-card p-6 sm:p-8 space-y-6 flex flex-col">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                Your Rounds ⛳
              </h2>
              <p className="text-slate-500 font-medium mt-1">Submit scores (1-45). Your last 5 form your tournament ticket.</p>
            </div>



            <form onSubmit={handleAddScore} className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="number" min="1" max="45" required
                  value={scoreInput === '' ? '' : scoreInput}
                  onChange={(e) => setScoreInput(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={isSubmittingScore}
                  className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 font-bold text-slate-700 bg-slate-50 focus:bg-white"
                  placeholder="Enter score 1-45"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isSubmittingScore || scoreInput === ''}
                  className="px-6 py-3.5 bg-green-500 text-white rounded-xl font-bold border-b-4 border-green-600 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isSubmittingScore ? '...' : 'Play Shot'}
                </motion.button>
              </div>
            </form>

            <div className="pt-6 mt-auto">
              <h3 className="font-bold text-slate-700 mb-4 uppercase text-xs tracking-widest text-green-800/60">Official Scorecard ({scores.length}/5)</h3>
              {scores.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-green-200 rounded-2xl text-center bg-green-50/50">
                  <p className="text-green-600 font-bold">No structured bounds generated.</p>
                  <p className="text-green-500 text-sm">Hit the green to start recording!</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 p-4 bg-pattern-grid rounded-xl border border-green-100 bg-white/50 shadow-inner">
                  <AnimatePresence>
                    {scores.map((s, i) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
                        transition={{ delay: i * 0.1, type: "spring" }}
                        key={s.id} 
                        className="w-14 h-14 flex flex-col items-center justify-center bg-white border border-green-200 rounded-xl shadow-sm font-extrabold text-slate-800 text-xl relative overflow-hidden group"
                      >
                        <div className="absolute top-0 left-0 w-full h-1 bg-green-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {s.score}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>

          {/* Charity Selection */}
          <motion.div variants={itemVariants} className="glass-card p-6 sm:p-8 space-y-6">
             <div>
               <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                 Your Charity 🌿
               </h2>
               <p className="text-slate-500 font-medium mt-1">Choose where your impact flows.</p>
             </div>

             <form onSubmit={handleSaveCharity} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Select Organization</label>
                  <select
                    value={selectedCharity}
                    onChange={(e) => setSelectedCharity(e.target.value)}
                    disabled={isSubmittingCharity}
                    className="w-full p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white font-semibold text-slate-700 shadow-sm"
                  >
                    <option value="" disabled>Choose a charity...</option>
                    {availableCharities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="flex justify-between items-center">
                     <label className="block text-sm font-bold text-slate-700">Contribution Size</label>
                     <span className="font-extrabold text-green-500 text-lg px-3 py-1 bg-white rounded-lg shadow-sm">{percentage}%</span>
                   </div>
                   
                   <div className="relative h-2 w-full bg-slate-200 rounded-full mt-4">
                     <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${percentage}%` }} 
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="absolute top-0 left-0 h-full bg-green-500 rounded-full"
                     />
                     <input
                        type="range" min="10" max="100" step="5"
                        value={percentage}
                        onChange={(e) => setPercentage(Number(e.target.value))}
                        disabled={isSubmittingCharity}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                     />
                   </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmittingCharity}
                  className="w-full bg-sky-400 text-white py-4 rounded-xl font-extrabold border-b-4 border-sky-500 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 text-lg"
                >
                  {isSubmittingCharity ? 'Saving...' : 'Set Impact Preferences 🚀'}
                </motion.button>
             </form>
          </motion.div>

          {/* Tournament Results */}
          <motion.div variants={itemVariants} className="glass-card p-6 sm:p-8 space-y-6 md:col-span-2 border-t-4 border-t-amber-400">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div>
                 <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                   Tournament Results 🏆
                 </h2>
                 <p className="text-slate-500 font-medium mt-1">
                   {latestDraw?.status === 'published' 
                     ? `Official draw for ${latestDraw.month}/${latestDraw.year}` 
                     : "The tournament is currently underway. Check back soon."}
                 </p>
               </div>
               
               {latestDraw?.status === 'published' && matches.length >= 3 && (
                 <motion.div 
                   initial={{ scale: 0.8, opacity: 0 }} 
                   animate={{ scale: 1, opacity: 1 }} 
                   className="px-6 py-3 bg-amber-100 text-amber-800 rounded-xl font-extrabold shadow-sm border border-amber-200 flex items-center gap-2"
                 >
                   <span>🎉 You matched {matches.length}!</span>
                 </motion.div>
               )}
             </div>

             {latestDraw?.status === 'published' && (
               <div className="flex flex-wrap gap-4 pt-4">
                 {drawNums.map((num: number, i: number) => {
                   const isMatch = matches.includes(num);
                   return (
                     <motion.div 
                       key={i}
                       initial={{ opacity: 0, scale: 0 }}
                       animate={{ 
                         opacity: 1, 
                         scale: 1,
                         y: [0, -10, 0] // subtle bounce
                       }}
                       transition={{ 
                         delay: i * 0.2, 
                         duration: 0.5,
                         y: { duration: 0.4, delay: i * 0.2 + 0.5 }
                       }}
                       className={`w-16 h-16 flex flex-col items-center justify-center font-extrabold text-2xl rounded-2xl shadow-sm border ${
                         isMatch 
                         ? 'bg-green-500 text-white border-green-600 shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
                         : 'bg-slate-100 border-slate-200 text-slate-700'
                       }`}
                     >
                       {num}
                     </motion.div>
                   )
                 })}
               </div>
             )}
          </motion.div>

        </motion.div>

      </div>
    </div>
  )
}
