'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import { createDrawSimulation, publishDraw, getLatestDraw } from '@/lib/draw'

export default function AdminPage() {
  const router = useRouter()
  const [isInitializing, setIsInitializing] = useState(true)
  
  // Draw State
  const [activeDraw, setActiveDraw] = useState<any | null>(null)
  const [drawMonth, setDrawMonth] = useState(new Date().getMonth() + 1)
  const [drawYear, setDrawYear] = useState(new Date().getFullYear())
  const [drawType, setDrawType] = useState<'random' | 'algorithm'>('random')
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const guard = async () => {
      try {
        const session = await getSession()
        if (!session) {
          if (active) router.push('/login')
          return
        }
        
        const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single()
        if (userData?.role !== 'admin') {
          if (active) router.push('/dashboard')
          return
        }

        const latest = await getLatestDraw()
        if (active) {
          setActiveDraw(latest)
          setIsInitializing(false)
        }
      } catch (error) {
        if (active) router.push('/login')
      }
    }
    guard()
    return () => { active = false }
  }, [router])

  const handleSimulate = async () => {
    setIsProcessing(true)
    setError('')
    setMessage('')
    try {
      const data = await createDrawSimulation(drawMonth, drawYear, drawType)
      setActiveDraw(data)
      setMessage('Draw simulation successfully created. Ready for review.')
    } catch (err: any) {
      setError(err.message || 'Error occurred during simulation.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePublish = async () => {
    if (!activeDraw || activeDraw.status === 'published') return
    setIsProcessing(true)
    setError('')
    setMessage('')
    try {
      const result = await publishDraw(activeDraw.id)
      setMessage(`Success! Draw published and distributed to ${result.winnersCount} winners.`)
      setActiveDraw({ ...activeDraw, status: 'published' })
    } catch (err: any) {
      setError(err.message || 'Error occurred during publishing block.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sky-50">
        <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-200 border-t-sky-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-yellow-100 p-6 flex flex-col">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between pb-6 border-b border-sky-200/50">
          <h1 className="text-3xl font-extrabold text-sky-950">System Administration</h1>
          <button 
            onClick={async () => { await signOut(); router.push('/login') }}
            className="px-5 py-2.5 text-sm font-semibold transition bg-white border border-slate-200 shadow-sm rounded-xl text-slate-600 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <div className="inline-flex items-center px-4 py-2 mb-6 text-sm font-bold tracking-wide uppercase bg-rose-50 rounded-lg text-rose-700">
            Draw Management Console
          </div>
          <h2 className="mb-4 text-2xl font-bold text-slate-800">Generate Monthly Draw</h2>
          <p className="max-w-2xl mb-8 font-medium leading-relaxed text-slate-500">
            Administrators can simulate the draw logic entirely before distributing live rewards. Select the algorithm bounds and initiate a draft simulation.
          </p>

          {error && <div className="p-4 mb-6 text-sm bg-rose-50 rounded-xl text-rose-700">{error}</div>}
          {message && <div className="p-4 mb-6 text-sm text-emerald-700 bg-emerald-50 rounded-xl">{message}</div>}

          {/* Active Draw Panel */}
          {activeDraw && activeDraw.status === 'draft' && (
            <div className="p-6 mb-8 border-2 border-amber-200 bg-amber-50 rounded-2xl">
              <h3 className="mb-4 text-lg font-bold text-amber-900">Active Draft Review</h3>
              <p className="mb-2 text-sm text-amber-800">Draw Date: {activeDraw.month}/{activeDraw.year} | Type: {activeDraw.type.toUpperCase()}</p>
              <div className="flex gap-3 mb-6">
                {activeDraw.draw_numbers.map((num: number, i: number) => (
                  <div key={i} className="flex items-center justify-center w-12 h-12 font-extrabold tracking-widest text-white shadow-sm bg-amber-600 rounded-xl">
                    {num}
                  </div>
                ))}
              </div>
              <p className="mb-6 text-sm font-semibold text-amber-800">Total Reward Pool Projected: ₹{activeDraw.total_pool.toLocaleString()}</p>
              
              <button 
                onClick={handlePublish}
                disabled={isProcessing}
                className="px-6 py-3 font-semibold text-white transition bg-amber-600 shadow-md rounded-xl hover:bg-amber-700 disabled:opacity-60"
              >
                {isProcessing ? 'Processing Framework...' : 'Publish Results & Dispatch Rewards'}
              </button>
            </div>
          )}

          {activeDraw && activeDraw.status === 'published' && (
            <div className="p-6 mb-8 border border-emerald-200 bg-emerald-50 rounded-2xl">
              <h3 className="mb-2 text-lg font-bold text-emerald-800">Latest Live Draw: {activeDraw.month}/{activeDraw.year}</h3>
              <p className="text-sm font-semibold text-emerald-700">This sweepstakes is published and distributed.</p>
              <div className="flex gap-3 mt-4">
                {activeDraw.draw_numbers.map((num: number, i: number) => (
                  <div key={i} className="flex items-center justify-center w-10 h-10 font-bold text-white shadow-sm bg-emerald-500 rounded-xl">
                    {num}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Creation Form */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100">
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-slate-700">Month</label>
              <input type="number" min="1" max="12" value={drawMonth} onChange={e => setDrawMonth(Number(e.target.value))} className="w-full px-4 py-3 transition border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none shadow-sm" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-slate-700">Year</label>
              <input type="number" min="2024" max="2100" value={drawYear} onChange={e => setDrawYear(Number(e.target.value))} className="w-full px-4 py-3 transition border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none shadow-sm" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-slate-700">Model Structure</label>
              <select value={drawType} onChange={e => setDrawType(e.target.value as any)} className="w-full px-4 py-3 transition border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none shadow-sm bg-white">
                <option value="random">Pure Randomness</option>
                <option value="algorithm">Algorithmic Distribution</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={handleSimulate}
            disabled={isProcessing || (activeDraw?.status === 'draft')}
            className="w-full px-6 py-4 mt-8 font-semibold text-white transition shadow-sm bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-60"
          >
            {isProcessing ? 'Executing Calculations...' : 'Execute Simulation Run'}
          </button>
        </div>
      </div>
    </div>
  )
}
