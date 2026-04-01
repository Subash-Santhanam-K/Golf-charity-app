'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { motion } from 'framer-motion'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMsg('')
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError || !authData.user) {
      setError(authError?.message || 'Error creating your profile.')
      setLoading(false)
      return
    }

    const { error: dbError } = await supabase.from('users').upsert([
      { id: authData.user.id, email, role: 'user' }
    ], { onConflict: 'id' })

    if (dbError) {
      setError('Your account was created, but we failed to initialize permissions.')
      setLoading(false)
      return
    }

    setMsg('Welcome to the club! You can now tee off. 🌟')
    setLoading(false)
    setTimeout(() => {
       router.push('/login')
    }, 2500)
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
             <div className="text-4xl mb-2">🚩</div>
             <h2 className="text-2xl font-bold text-slate-800">Join the movement ❤️</h2>
             <p className="text-slate-500 font-medium mt-1">Create your profile and start your journey.</p>
          </div>
          
          {error && <motion.div initial={{opacity:0}} animate={{opacity:1}} className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">{error}</motion.div>}
          {msg && <motion.div initial={{opacity:0}} animate={{opacity:1}} className="p-3 bg-green-50 text-green-700 rounded-xl text-sm font-bold border border-green-200">{msg}</motion.div>}
          
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700">Email Address</label>
              <input
                type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50 focus:bg-white transition-colors"
                placeholder="you@makeanimpact.com"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700">Password</label>
              <input
                type="password" required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50 focus:bg-white transition-colors"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(134, 239, 172, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 text-white py-3.5 rounded-xl transition-all duration-300 mt-4 disabled:opacity-50 font-bold border-b-4 border-green-600 active:border-b-0 active:translate-y-1 text-lg"
            >
              {loading ? 'Preparing Bag...' : 'Join the Club 🏌️'}
            </motion.button>
          </form>
          
          <p className="text-center text-sm text-slate-500 pt-2 font-medium">
            Already a change-maker? <Link href="/login" className="text-green-600 font-bold hover:underline">Login here</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
