'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSession } from '@/lib/auth'
import { getSubscriptionHistory } from '@/lib/subscription'
import { motion } from 'framer-motion'

export default function SubscribePage() {
  const router = useRouter()
  const [isInitializing, setIsInitializing] = useState(true)

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
        if (active) setIsInitializing(false)
      } catch (e) {
         if (active) router.push('/login')
      }
    }
    checkAccess()
    return () => { active = false }
  }, [router])

  const plans = [
    { id: 'monthly', name: 'Monthly Round', price: 299, period: 'month', icon: '⛳', description: 'Perfect to start your journey on the green.' },
    { id: 'yearly', name: 'Annual Membership', price: 2999, period: 'year', icon: '🏆', description: 'Maximize your global charitable footprint.' }
  ]

  const handleSelect = (planId: string) => {
    router.push(`/checkout?plan=${planId}`)
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-golf-texture">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  }

  const item: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  }

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-golf-texture relative">
      <div className="max-w-5xl mx-auto w-full space-y-6 z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2 mb-8"
        >
          <div className="text-4xl mb-2">🏌️‍♀️</div>
          <h1 className="text-3xl font-extrabold text-slate-800">Select your impact level</h1>
          <p className="text-slate-600 text-lg font-medium max-w-xl mx-auto">
            Your subscription powers our tournament ecosystem and guarantees real charity impact.
          </p>
        </motion.div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {plans.map((plan) => (
            <motion.div 
               variants={item}
               key={plan.id} 
               onClick={() => handleSelect(plan.id)}
               whileHover={{ scale: 1.02, boxShadow: "0px 10px 20px rgba(134, 239, 172, 0.2)" }}
               whileTap={{ scale: 0.98 }}
               className="glass-card p-8 sm:p-10 space-y-6 flex flex-col text-center cursor-pointer transition-all duration-300 border-b-4 border-b-transparent hover:border-b-green-400"
            >
              <div className="text-5xl drop-shadow-sm">{plan.icon}</div>
              <h2 className="text-2xl font-bold text-slate-800">{plan.name}</h2>
              <p className="text-slate-500 font-medium">{plan.description}</p>
              
              <div className="py-4">
                <span className="text-4xl font-extrabold text-slate-800">₹{plan.price}</span>
                <span className="text-slate-400 font-bold"> / {plan.period}</span>
              </div>
              
              <button className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-bold text-lg mt-auto pointer-events-none transition-colors group-hover:bg-green-500">
                Secure your Tee Time ⛳
              </button>
            </motion.div>
          ))}
        </motion.div>
        
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center text-slate-400 text-sm mt-8 font-semibold">
           Secure checkouts via custom architecture. Cancel at any time.
        </motion.div>
      </div>
    </div>
  )
}
