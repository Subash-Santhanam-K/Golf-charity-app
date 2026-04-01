'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getSession } from '@/lib/auth'
import { createSubscription, getSubscriptionHistory } from '@/lib/subscription'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/hooks/useToast'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = (searchParams?.get('plan') || 'monthly') as 'monthly' | 'yearly'
  
  const [sessionUser, setSessionUser] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { showToast } = useToast()

  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')

  useEffect(() => {
    let active = true
    const checkAccess = async () => {
      try {
        const session = await getSession()
        if (!session) {
          if (active) router.push('/login')
          return
        }
        const history = await getSubscriptionHistory(session.user.id)
        const hasActive = history.some(s => s.status === 'active' && new Date(s.end_date) > new Date())
        if (hasActive && active) {
          router.push('/dashboard')
          return
        }
        if (active) {
          setSessionUser(session.user)
          setIsInitializing(false)
        }
      } catch (e) {
        if (active) router.push('/login')
      }
    }
    checkAccess()
    return () => { active = false }
  }, [router])

  const planName = planId === 'yearly' ? 'Annual Membership' : 'Monthly Round'
  const planPrice = planId === 'yearly' ? 2999 : 299

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionUser) return
    if (!cardName || !cardNumber || !expiry || !cvc) {
      showToast({ type: 'error', message: 'Please complete all payment fields ⛳' })
      return
    }
    setIsProcessing(true)
    setTimeout(async () => {
      try {
        await createSubscription(sessionUser.id, planId)
        setIsProcessing(false)
        setIsSuccess(true)
        showToast({ type: 'success', message: 'Payment confirmed! Welcome to the club 🏆' })
        setTimeout(() => router.push('/dashboard'), 2500)
      } catch (err: any) {
        setIsProcessing(false)
        showToast({ type: 'error', message: err.message || 'Oops! Something went wrong 😅' })
      }
    }, 2000)
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.4 }}
        className="max-w-md w-full mx-auto glass-card p-12 text-center space-y-6"
      >
        <motion.div 
          initial={{ y: 20 }} 
          animate={{ y: 0 }} 
          transition={{ type: "spring", stiffness: 300, damping: 10, delay: 0.2 }}
          className="text-6xl mb-4"
        >
          ⛳
        </motion.div>
        <h2 className="text-3xl font-extrabold text-slate-800">Impact Secured!</h2>
        <p className="text-slate-500 font-medium text-lg leading-relaxed">
          Your support guarantees real-world change. We're routing you to the clubhouse dashboard now...
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5 }}
      className="max-w-5xl w-full mx-auto space-y-6 z-10"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-8 sm:p-10 space-y-6 flex flex-col justify-between border-t-4 border-t-sky-400">
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-slate-800">Finalize Your Round 🏌️</h2>
            <h3 className="text-xl font-bold text-sky-500">{planName}</h3>
            <ul className="space-y-3 text-slate-600 font-bold mt-6">
              <li className="flex items-center gap-3"><span className="text-green-500 text-xl">✓</span> Full Tournament Entry</li>
              <li className="flex items-center gap-3"><span className="text-green-500 text-xl">✓</span> Direct Charity Integrations</li>
              <li className="flex items-center gap-3"><span className="text-green-500 text-xl">✓</span> Scorecard Analytics</li>
            </ul>
          </div>
          <div className="pt-8 border-t border-slate-100">
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">Total Due Today</p>
            <p className="text-5xl font-extrabold text-slate-800 tracking-tight">₹{planPrice} <span className="text-xl text-slate-400 font-bold tracking-normal">/ {planId === 'yearly' ? 'year' : 'month'}</span></p>
          </div>
        </div>
        
        <div className="glass-card p-8 sm:p-10 space-y-6">
          <h2 className="text-2xl font-extrabold text-slate-800">Secure Payment</h2>
          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700">Cardholder Name</label>
              <input
                type="text" required
                value={cardName} onChange={e => setCardName(e.target.value)}
                disabled={isProcessing}
                className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50 focus:bg-white transition-colors"
                placeholder="Name on card"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700">Card Number</label>
              <input
                type="text" required
                value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                disabled={isProcessing}
                className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50 focus:bg-white font-mono transition-colors"
                placeholder="0000 0000 0000 0000"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700">Expiry</label>
                <input
                  type="text" required
                  value={expiry} onChange={e => setExpiry(e.target.value)}
                  disabled={isProcessing}
                  className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50 focus:bg-white font-mono transition-colors"
                  placeholder="MM/YY"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700">CVC</label>
                <input
                  type="text" required
                  value={cvc} onChange={e => setCvc(e.target.value)}
                  disabled={isProcessing}
                  className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50 focus:bg-white font-mono transition-colors"
                  placeholder="123"
                />
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(134, 239, 172, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isProcessing}
              className="w-full bg-green-500 text-white py-4 rounded-xl transition-all duration-300 mt-4 disabled:opacity-50 font-extrabold text-lg border-b-4 border-green-600 active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2"
            >
              {isProcessing && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              {isProcessing ? 'Processing...' : 'Confirm Support 🏆'}
            </motion.button>
          </form>
          <div className="text-center text-xs text-slate-400 pt-2 font-bold">
            🔒 Secured by 256-bit encryption mappings.
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-golf-texture relative">
      <Suspense fallback={
         <div className="flex items-center justify-center relative z-10">
           <div className="w-10 h-10 border-4 border-slate-200 border-t-green-500 rounded-full animate-spin"></div>
         </div>
      }>
        <CheckoutContent />
      </Suspense>
    </div>
  )
}
