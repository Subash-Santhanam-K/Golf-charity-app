'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getSession } from '@/lib/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { addScore, getUserScores, checkTournamentOpen, Score } from '@/lib/scores'
import { getAvailableCharities, setUserCharity, getUserCharitySelection, getGlobalImpact } from '@/lib/charity'
import { getLatestDraw, getUserWinnings } from '@/lib/draw'
import { getUserWinner, uploadWinnerProof, Winner } from '@/lib/winners'
import { useToast } from '@/hooks/useToast'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { CountUp } from '@/components/ui/CountUp'

export default function DashboardPage() {
  const router = useRouter()
  const { showToast } = useToast()
  
  const [user, setUser] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  
  // Scores
  const [scores, setScores] = useState<Score[]>([])
  const [scoreInput, setScoreInput] = useState<number | ''>('')
  const [isSubmittingScore, setIsSubmittingScore] = useState(false)
  
  // Tournament lock state
  const [isTournamentLocked, setIsTournamentLocked] = useState(false)
  const [tournamentMessage, setTournamentMessage] = useState('')
  
  // Charities
  const [availableCharities, setAvailableCharities] = useState<any[]>([])
  const [selectedCharity, setSelectedCharity] = useState('')
  const [percentage, setPercentage] = useState<number>(30)
  const [isSubmittingCharity, setIsSubmittingCharity] = useState(false)
  const [totalImpact, setTotalImpact] = useState(0)

  // Tournament (Draw)
  const [latestDraw, setLatestDraw] = useState<any>(null)

  // Winner verification
  const [winnerRecord, setWinnerRecord] = useState<Winner | null>(null)
  const [isUploadingProof, setIsUploadingProof] = useState(false)
  const [proofPreview, setProofPreview] = useState<string | null>(null)

  // Winnings history
  const [userWinnings, setUserWinnings] = useState<any[]>([])

  useEffect(() => {
    let active = true
    const initData = async () => {
      try {
        const session = await getSession()
        if (!session) {
          if (active) router.push('/login')
          return
        }

        const [fetchedScores, charitiesInfo, charSel, impactVal, draw, tournamentStatus] = await Promise.all([
          getUserScores(session.user.id),
          getAvailableCharities(),
          getUserCharitySelection(session.user.id),
          getGlobalImpact(),
          getLatestDraw(),
          checkTournamentOpen()
        ])

        if (active) {
          setUser(session.user)
          setScores(fetchedScores)
          setAvailableCharities(charitiesInfo)
          setTotalImpact(impactVal)
          setLatestDraw(draw)
          setIsTournamentLocked(!tournamentStatus.open)
          setTournamentMessage(tournamentStatus.message || '')

          // Fetch winner record if draw is published
          if (draw && draw.status === 'published') {
            const winner = await getUserWinner(session.user.id, draw.id)
            if (active && winner) setWinnerRecord(winner)
          }

          // Fetch all-time winnings
          const winnings = await getUserWinnings(session.user.id)
          if (active) setUserWinnings(winnings)
          
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
      const raw = err.message || ''
      if (raw.includes('already') || raw.includes('duplicate')) {
        showToast({ type: 'error', message: 'You already played this round today ⛳' })
      } else if (raw.includes('tournament') || raw.includes('closed') || raw.includes('ended')) {
        showToast({ type: 'error', message: raw })
      } else {
        showToast({ type: 'error', message: 'Oops! Something didn\'t go as planned 😅' })
      }
    }
    setIsSubmittingScore(false)
  }

  const handleSaveCharity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!selectedCharity) {
      showToast({ type: 'info', message: 'Please select a charity before continuing 🌱' })
      return
    }
    setIsSubmittingCharity(true)
    try {
      await setUserCharity(user.id, selectedCharity, percentage)
      showToast({ type: 'success', message: '❤️ Your impact preference has been saved successfully!' })
    } catch(err: any) {
      showToast({ type: 'error', message: '⚠️ We couldn\'t save your preference. Please try again.' })
    }
    setIsSubmittingCharity(false)
  }

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !winnerRecord) return
    
    // Show preview
    const reader = new FileReader()
    reader.onload = (ev) => setProofPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setIsUploadingProof(true)
    try {
      const proofUrl = await uploadWinnerProof(winnerRecord.id, user.id, file)
      setWinnerRecord({ ...winnerRecord, proof_url: proofUrl })
      showToast({ type: 'success', message: '✅ Proof submitted! Awaiting admin verification.' })
    } catch (err: any) {
      setProofPreview(null)
      showToast({ type: 'error', message: '❌ Upload failed. Please try again.' })
    }
    setIsUploadingProof(false)
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
  const bestScore = scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0
  const userTier = matches.length >= 5 ? 'Jackpot 🏆' : matches.length >= 3 ? `Tier ${6 - matches.length}` : 'Contender'
  const contribution = Math.round(totalImpact * percentage / 100)

  // Selected charity object
  const selectedCharityObj = availableCharities.find(c => c.id === selectedCharity)

  // Dynamic match result message
  const getMatchMessage = (count: number) => {
    if (count === 0) return '⛳ Better luck next round!'
    if (count === 1) return '🏌️ A start! Keep playing.'
    if (count === 2) return '💪 So close! Keep going!'
    if (count === 3) return '🎉 You matched 3 numbers!'
    if (count === 4) return '🔥 Almost jackpot!'
    return '🏆 JACKPOT WINNER!'
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-golf-texture">
      <OnboardingModal />
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="glass-card p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">⛳</div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Play. Win. Make an Impact <span className="text-red-400">❤️</span></h1>
                <p className="text-slate-500 font-medium mt-1">Every round you play helps someone, somewhere.</p>
              </div>
            </div>
            <button 
               onClick={handleSignOut}
               className="px-5 py-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-bold text-slate-700 w-full sm:w-auto"
            >
              Sign Out
            </button>
          </div>

          {/* Mini Stats Bar */}
          <motion.div 
            variants={containerVariants} initial="hidden" animate="show"
            className="grid grid-cols-3 gap-3"
          >
            {[
              { icon: '🏆', label: 'Best Score', value: bestScore || '—' },
              { icon: '🎯', label: 'Current Tier', value: userTier },
              { icon: '❤️', label: 'Your Contribution', value: `₹${contribution.toLocaleString('en-IN')}` },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                variants={itemVariants}
                whileHover={{ scale: 1.03, boxShadow: '0 4px 15px rgba(134,239,172,0.15)' }}
                className="bg-white/80 rounded-xl p-3 sm:p-4 text-center border border-green-100 shadow-sm"
              >
                <div className="text-2xl mb-1">{stat.icon}</div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg font-extrabold text-slate-800 mt-0.5">{stat.value}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Community Impact */}
        <motion.div 
           initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
           className="glass-card p-8 text-center border-t-4 border-t-green-400 relative overflow-hidden"
        >
            <div className="absolute top-[-30%] right-[-15%] text-[12rem] opacity-[0.03] pointer-events-none">❤️</div>
            <h2 className="uppercase tracking-widest text-xs font-bold text-slate-400 mb-3">Community Impact</h2>
            <div className="flex justify-center items-center gap-2">
               <p className="text-5xl sm:text-6xl font-extrabold text-green-500 tracking-tight">
                 <CountUp end={totalImpact} prefix="₹" duration={1800} />
               </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm font-bold text-slate-500">
              <span>🌱 {Math.round(totalImpact / 50).toLocaleString()} meals provided</span>
              <span>📚 {Math.round(totalImpact / 800).toLocaleString()} children supported</span>
            </div>
            <p className="text-slate-400 font-bold mt-3 italic">You played. Someone smiled ❤️</p>
        </motion.div>

        {/* Tournament Status Banner */}
        {isTournamentLocked ? (
          <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             className="glass-card p-5 text-center border-l-4 border-l-amber-400 bg-amber-50/80"
          >
            <p className="text-amber-800 font-bold text-lg">🏁 {tournamentMessage || "This month's tournament has ended. Get ready for the next round ⛳"}</p>
          </motion.div>
        ) : (
          <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             className="glass-card p-5 text-center border-l-4 border-l-green-400 bg-green-50/80"
          >
            <p className="text-green-800 font-bold text-lg">⛳ Submit your rounds before the draw closes!</p>
          </motion.div>
        )}

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Your Rounds (Score Management) */}
          <motion.div variants={itemVariants} className="glass-card p-6 sm:p-8 space-y-6 flex flex-col">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                Your Rounds ⛳
              </h2>
              <p className="text-slate-500 font-medium mt-1">
                {isTournamentLocked
                  ? 'Submissions are closed for this month\'s tournament.'
                  : 'Submit scores (1-45). Your last 5 form your tournament ticket.'}
              </p>
            </div>

            <form onSubmit={handleAddScore} className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="number" min="1" max="45" required
                  value={scoreInput === '' ? '' : scoreInput}
                  onChange={(e) => setScoreInput(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={isSubmittingScore || isTournamentLocked}
                  className={`w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 font-bold text-slate-700 bg-slate-50 focus:bg-white ${isTournamentLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder={isTournamentLocked ? 'Submissions closed' : 'Enter score 1-45'}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isSubmittingScore || scoreInput === '' || isTournamentLocked}
                  className={`px-6 py-3.5 bg-green-500 text-white rounded-xl font-bold border-b-4 border-green-600 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 whitespace-nowrap ${isTournamentLocked ? 'cursor-not-allowed' : ''}`}
                >
                  {isSubmittingScore ? '...' : 'Play Shot'}
                </motion.button>
              </div>
            </form>

            <div className="pt-6 mt-auto">
              <h3 className="font-bold text-slate-700 mb-4 uppercase text-xs tracking-widest text-green-800/60">Official Scorecard ({scores.length}/5)</h3>
              {scores.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-green-200 rounded-2xl text-center bg-green-50/50">
                  <p className="text-green-600 font-bold text-lg">Hit the green to start your journey ⛳</p>
                  <p className="text-green-500 text-sm mt-1">Your scores appear here as golf balls.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-green-100 bg-white/50 shadow-inner">
                  <AnimatePresence>
                    {scores.map((s, i) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
                        transition={{ delay: i * 0.1, type: "spring" }}
                        key={s.id} 
                        whileHover={{ scale: 1.1, boxShadow: '0 0 12px rgba(34,197,94,0.3)' }}
                        className="w-14 h-14 flex flex-col items-center justify-center bg-white border border-green-200 rounded-xl shadow-sm font-extrabold text-slate-800 text-xl relative overflow-hidden group cursor-default"
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
          <motion.div variants={itemVariants} whileHover={{ scale: 1.005 }} className="glass-card p-6 sm:p-8 space-y-5">
             <div>
               <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                 You&apos;re Making an Impact ❤️
               </h2>
               <p className="text-slate-500 font-medium mt-1">
                 {selectedCharityObj
                   ? `You're supporting ${selectedCharityObj.name}`
                   : 'Choose where your impact flows.'}
               </p>
             </div>

             {/* Charity hero preview */}
             {selectedCharityObj && (
               <motion.div 
                 key={selectedCharityObj.id}
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                 className="rounded-2xl overflow-hidden border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50"
               >
                 {/* Image or Emoji banner */}
                 {selectedCharityObj.image_url?.startsWith('http') ? (
                   <img
                     src={selectedCharityObj.image_url}
                     alt={selectedCharityObj.name}
                     className="w-full h-40 object-cover"
                   />
                 ) : (
                   <div className="w-full h-32 flex items-center justify-center text-7xl bg-green-100/50">
                     {selectedCharityObj.image_url}
                   </div>
                 )}
                 <div className="p-4 space-y-1">
                   <p className="font-extrabold text-green-800 text-lg">{selectedCharityObj.name}</p>
                   <p className="text-sm text-green-700">{selectedCharityObj.short_description}</p>
                   <p className="text-xs text-green-600 italic mt-2">{selectedCharityObj.why_matters}</p>
                 </div>
               </motion.div>
             )}

             <form onSubmit={handleSaveCharity} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Select Organization</label>
                  <select
                    value={selectedCharity}
                    onChange={(e) => setSelectedCharity(e.target.value)}
                    disabled={isSubmittingCharity}
                    className="w-full p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white font-semibold text-slate-700 shadow-sm hover:border-green-300 transition-colors"
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
                     <span className="font-extrabold text-green-500 text-lg px-3 py-1 bg-white rounded-md shadow-sm">{percentage}%</span>
                   </div>
                   
                   <div className="relative h-2.5 w-full bg-slate-200 rounded-full mt-4">
                     <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${percentage}%` }} 
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
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
                  whileHover={{ scale: 1.03, boxShadow: '0 8px 25px rgba(56,189,248,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={isSubmittingCharity}
                  className="w-full bg-sky-400 text-white py-4 rounded-xl font-extrabold border-b-4 border-sky-500 active:border-b-0 active:translate-y-1 transition-all duration-300 disabled:opacity-50 text-lg"
                >
                  {isSubmittingCharity ? 'Saving your impact…' : 'Set Impact Preferences 🚀'}
                </motion.button>
             </form>
          </motion.div>

          {/* Tournament Results */}
          <motion.div variants={itemVariants} className="glass-card p-6 sm:p-8 space-y-6 md:col-span-2 border-t-4 border-t-amber-400 relative overflow-hidden">
             <div className="absolute top-[-20%] right-[-10%] text-[10rem] opacity-[0.03] pointer-events-none">🏆</div>
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
               
               {latestDraw?.status === 'published' && (
                 <motion.div 
                   initial={{ scale: 0.8, opacity: 0 }} 
                   animate={{ scale: 1, opacity: 1 }}
                   className={`px-6 py-3 rounded-xl font-extrabold shadow-sm flex items-center gap-2 ${
                     matches.length >= 5 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                     matches.length >= 3 ? 'bg-green-100 text-green-800 border border-green-200' :
                     'bg-slate-100 text-slate-600 border border-slate-200'
                   }`}
                 >
                   <span>{getMatchMessage(matches.length)}</span>
                 </motion.div>
               )}
             </div>

             {latestDraw?.status === 'published' && (
               <>
                 <div className="flex flex-wrap gap-4 pt-4">
                   {drawNums.map((num: number, i: number) => {
                     const isMatch = matches.includes(num);
                     return (
                       <motion.div 
                         key={i}
                         initial={{ opacity: 0, scale: 0.5, rotateY: 90 }}
                         animate={{ 
                           opacity: 1, 
                           scale: [0.5, 1.15, 1],
                           rotateY: 0,
                         }}
                         transition={{ 
                           delay: i * 0.3, 
                           duration: 0.5,
                           ease: [0.22, 1, 0.36, 1],
                         }}
                         whileHover={{ scale: 1.1 }}
                         className={`w-16 h-16 flex flex-col items-center justify-center font-extrabold text-2xl rounded-2xl border transition-shadow ${
                           isMatch 
                           ? 'bg-green-500 text-white border-green-600 shadow-[0_0_25px_rgba(34,197,94,0.5)] animate-pulse' 
                           : 'bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
                         }`}
                       >
                         {num}
                       </motion.div>
                     )
                   })}
                 </div>
                 <p className="text-center text-slate-400 font-bold italic mt-4">This month&apos;s tournament changed lives ❤️</p>
               </>
             )}
          </motion.div>

          {/* Winner Proof Upload — only if user won (match >= 3) */}
          {winnerRecord && matches.length >= 3 && (
            <motion.div 
              variants={itemVariants}
              className="glass-card p-6 sm:p-8 space-y-5 md:col-span-2 border-t-4 border-t-yellow-400 relative overflow-hidden"
            >
              <div className="absolute top-[-20%] right-[-10%] text-[10rem] opacity-[0.03] pointer-events-none">🏆</div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800">🏆 Your Winning Submission</h2>
                <p className="text-slate-500 font-medium mt-1">Your win is making a real-world impact ❤️</p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                  winnerRecord.status === 'approved' ? 'bg-green-100 text-green-800' :
                  winnerRecord.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {winnerRecord.status === 'approved' ? 'Approved ✅' :
                   winnerRecord.status === 'rejected' ? 'Rejected ❌' :
                   'Pending Review 🟡'}
                </span>
                {winnerRecord.payment_status === 'paid' && (
                  <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800">Paid 💸</span>
                )}
                <span className="text-slate-400 font-bold text-sm">Prize: ₹{winnerRecord.prize_amount?.toLocaleString()}</span>
              </div>

              {/* Proof display or upload */}
              {winnerRecord.proof_url || proofPreview ? (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-600">Your submitted proof:</p>
                  <img 
                    src={proofPreview || winnerRecord.proof_url} 
                    alt="Winner proof" 
                    className="w-full max-w-sm rounded-2xl border border-slate-200 shadow-sm"
                  />
                  <p className="text-sm text-green-600 font-bold">✅ Proof submitted successfully. Awaiting admin verification.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-600 font-medium">
                    Congratulations! 🎉 You&apos;ve won this month&apos;s draw. Upload proof to claim your reward.
                  </p>
                  <label className="block">
                    <input 
                      type="file" 
                      accept="image/png,image/jpeg" 
                      onChange={handleProofUpload}
                      disabled={isUploadingProof}
                      className="hidden"
                      id="proof-upload"
                    />
                    <motion.span
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`inline-block px-8 py-3.5 bg-amber-500 text-white rounded-xl font-bold text-lg border-b-4 border-amber-600 cursor-pointer transition-all ${isUploadingProof ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isUploadingProof ? 'Uploading your proof...' : 'Upload Proof 📸'}
                    </motion.span>
                  </label>
                  <p className="text-xs text-slate-400">PNG or JPEG, max 5MB</p>
                </div>
              )}
            </motion.div>
          )}

        </motion.div>

        {/* Game Summary + Winnings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 📊 Your Game Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card p-6 sm:p-8 space-y-5"
          >
            <h2 className="text-2xl font-extrabold text-slate-800">📊 Your Game Summary</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/80 rounded-xl p-4 text-center border border-slate-100 shadow-sm">
                <p className="text-3xl font-extrabold text-sky-600">{userWinnings.length || 0}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Draws Entered</p>
              </div>
              <div className="bg-white/80 rounded-xl p-4 text-center border border-slate-100 shadow-sm">
                <p className="text-3xl font-extrabold text-green-500">{scores.length}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Total Rounds</p>
              </div>
              <div className="bg-white/80 rounded-xl p-4 text-center border border-slate-100 shadow-sm">
                <p className={`text-lg font-extrabold ${isTournamentLocked ? 'text-amber-600' : 'text-green-600'}`}>
                  {isTournamentLocked ? '🏁 Closed' : '⛳ Open'}
                </p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">This Month</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 italic font-medium">Every round brings you closer to impact ❤️</p>
          </motion.div>

          {/* 💰 Your Winnings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="glass-card p-6 sm:p-8 space-y-5"
          >
            <h2 className="text-2xl font-extrabold text-slate-800">💰 Your Winnings</h2>
            {userWinnings.length > 0 ? (
              <>
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-extrabold text-green-500">
                    ₹{userWinnings.reduce((sum: number, w: any) => sum + (w.prize_amount || 0), 0).toLocaleString()}
                  </p>
                  <span className="text-sm font-bold text-slate-400 mb-1">total earned</span>
                </div>

                {/* Latest win */}
                <div className="p-4 bg-green-50/80 rounded-xl border border-green-100 space-y-2">
                  <p className="text-xs font-bold text-green-600 uppercase">Latest Win</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-green-800">
                      {userWinnings[0].draws?.month}/{userWinnings[0].draws?.year} — {userWinnings[0].match_count} matches
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      userWinnings[0].payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                      userWinnings[0].status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {userWinnings[0].payment_status === 'paid' ? '💸 Paid' :
                       userWinnings[0].status === 'approved' ? '✅ Approved' : '🟡 Pending'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-green-700">₹{userWinnings[0].prize_amount?.toLocaleString()}</p>
                </div>

                <p className="text-sm text-slate-400 italic font-medium">Keep playing. Your next win is closer than you think 🚀</p>
              </>
            ) : (
              <div className="p-8 border-2 border-dashed border-amber-200 rounded-2xl text-center bg-amber-50/30">
                <p className="text-4xl mb-2">⛳</p>
                <p className="font-bold text-amber-700">You&apos;re one round away from your first win!</p>
                <p className="text-sm text-amber-600 mt-1">Every round brings you closer to impact ❤️</p>
              </div>
            )}
          </motion.div>

        </div>

      </div>
    </div>
  )
}
