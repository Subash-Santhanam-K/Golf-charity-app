'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSubscriptionHistory } from '@/lib/subscription'
import { getSession } from '@/lib/auth'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let active = true
    const checkUser = async () => {
      const session = await getSession()
      if (session && active) router.push('/dashboard')
    }
    checkUser()
    return () => { active = false }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: userRecord, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('Invalid login credentials. Please try again.')
      setLoading(false)
      return
    }

    if (!userRecord || !userRecord.user) {
      setError('An unexpected error occurred.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase.from('users').select('role').eq('id', userRecord.user.id).single()
    if (profile?.role === 'admin') {
      router.push('/admin')
      return
    }

    const history = await getSubscriptionHistory(userRecord.user.id)
    const hasActive = history.some(s => s.status === 'active' && new Date(s.end_date) > new Date())

    if (!hasActive) {
      router.push('/subscribe')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-golf-texture relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full mx-auto space-y-6 z-10"
      >
        <div className="glass-card p-8 space-y-6">
          <div className="text-center">
             <div className="text-4xl mb-2">🏌️‍♂️</div>
             <h2 className="text-2xl font-bold text-slate-800">Welcome back 🌟</h2>
             <p className="text-slate-500 font-medium mt-1">Continue your journey onto the green.</p>
          </div>
          
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
              {error}
            </motion.div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700">Email Address</label>
              <input
                type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-colors"
                placeholder="golfer@impact.com"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700">Password</label>
              <input
                type="password" required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-slate-50 focus:bg-white transition-colors"
                placeholder="••••••••"
              />
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-sky-400 text-white py-3.5 rounded-xl transition-all duration-300 mt-4 disabled:opacity-50 font-bold text-lg border-b-4 border-sky-500 active:border-b-0 active:translate-y-1"
            >
              {loading ? 'Entering Course...' : "Play Your Shot ⛳"}
            </motion.button>
          </form>
          
          <p className="text-center text-sm text-slate-500 pt-2 font-medium">
            First time playing? <Link href="/signup" className="text-green-600 font-bold hover:underline">Join the club ❤️</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
