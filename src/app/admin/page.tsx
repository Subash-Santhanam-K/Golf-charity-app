'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'
import { createDrawSimulation, publishDraw, getLatestDraw } from '@/lib/draw'
import { getAllWinners, updateWinnerStatus, markWinnerPaid, Winner } from '@/lib/winners'
import { getAdminUsers, getAdminCharities, createCharity, updateCharity, deleteCharity, getAdminStats, AdminUser, AdminCharity } from '@/lib/admin'
import { useToast } from '@/hooks/useToast'

export default function AdminPage() {
  const router = useRouter()
  const [isInitializing, setIsInitializing] = useState(true)
  const { showToast } = useToast()
  
  // Draw State
  const [activeDraw, setActiveDraw] = useState<any | null>(null)
  const [drawMonth, setDrawMonth] = useState(new Date().getMonth() + 1)
  const [drawYear, setDrawYear] = useState(new Date().getFullYear())
  const [drawType, setDrawType] = useState<'random' | 'algorithm'>('random')
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Winners
  const [winners, setWinners] = useState<Winner[]>([])
  const [winnerFilter, setWinnerFilter] = useState<'all' | 'pending' | 'approved' | 'paid'>('all')
  const [expandedProof, setExpandedProof] = useState<string | null>(null)

  // Users
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])

  // Charities
  const [charities, setCharities] = useState<AdminCharity[]>([])
  const [showCharityForm, setShowCharityForm] = useState(false)
  const [editingCharity, setEditingCharity] = useState<AdminCharity | null>(null)
  const [charityForm, setCharityForm] = useState({ name: '', short_description: '', impact_preview: '', image_url: '', why_matters: '' })
  const [isSavingCharity, setIsSavingCharity] = useState(false)

  // Stats
  const [stats, setStats] = useState({ totalUsers: 0, activeSubscribers: 0, totalWinners: 0 })

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

        const [latest, allWinners, users, charityList, adminStats] = await Promise.all([
          getLatestDraw(),
          getAllWinners(),
          getAdminUsers(),
          getAdminCharities(),
          getAdminStats(),
        ])

        if (active) {
          setActiveDraw(latest)
          setWinners(allWinners)
          setAdminUsers(users)
          setCharities(charityList)
          setStats(adminStats)
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

  // Charity handlers
  const resetCharityForm = () => {
    setCharityForm({ name: '', short_description: '', impact_preview: '', image_url: '', why_matters: '' })
    setEditingCharity(null)
    setShowCharityForm(false)
  }

  const handleSaveCharity = async () => {
    if (!charityForm.name.trim()) {
      showToast({ type: 'info', message: 'Charity name is required 🌱' })
      return
    }
    setIsSavingCharity(true)
    try {
      if (editingCharity) {
        await updateCharity(editingCharity.id, charityForm)
        setCharities(prev => prev.map(c => c.id === editingCharity.id ? { ...c, ...charityForm } : c))
        showToast({ type: 'success', message: 'Charity updated ✅' })
      } else {
        const created = await createCharity(charityForm)
        setCharities(prev => [created, ...prev])
        showToast({ type: 'success', message: 'Charity added successfully 🌱' })
      }
      resetCharityForm()
    } catch {
      showToast({ type: 'error', message: 'Failed to save charity 😅' })
    }
    setIsSavingCharity(false)
  }

  const handleDeleteCharity = async (id: string) => {
    if (!confirm('Delete this charity permanently?')) return
    try {
      await deleteCharity(id)
      setCharities(prev => prev.filter(c => c.id !== id))
      showToast({ type: 'success', message: 'Charity deleted' })
    } catch {
      showToast({ type: 'error', message: 'Failed to delete charity 😅' })
    }
  }

  const startEditCharity = (c: AdminCharity) => {
    setEditingCharity(c)
    setCharityForm({ name: c.name, short_description: c.short_description, impact_preview: c.impact_preview, image_url: c.image_url, why_matters: c.why_matters })
    setShowCharityForm(true)
  }

  // Filtered winners
  const filteredWinners = winnerFilter === 'all'
    ? winners
    : winnerFilter === 'paid'
    ? winners.filter(w => w.payment_status === 'paid')
    : winners.filter(w => w.status === winnerFilter)

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sky-50">
        <div className="w-10 h-10 border-4 rounded-full animate-spin border-slate-200 border-t-sky-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-yellow-100 p-4 sm:p-6 flex flex-col">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-sky-200/50">
          <div>
            <h1 className="text-3xl font-extrabold text-sky-950">⚡ Tournament Command Center</h1>
            <p className="text-slate-500 font-medium mt-1">Manage draws, users, charities, and rewards.</p>
          </div>
          <button 
            onClick={async () => { await signOut(); router.push('/login') }}
            className="px-5 py-2.5 text-sm font-semibold transition bg-white border border-slate-200 shadow-sm rounded-xl text-slate-600 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: '👥', label: 'Total Users', value: stats.totalUsers },
            { icon: '💳', label: 'Active Subscribers', value: stats.activeSubscribers },
            { icon: '⚡', label: 'Total Pool', value: `₹${(activeDraw?.total_pool || 0).toLocaleString()}` },
            { icon: '🏆', label: 'Total Winners', value: stats.totalWinners },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.icon} {s.label}</p>
              <p className="text-2xl font-extrabold text-sky-700 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Prize Tier Breakdown */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">🎰 Jackpot (40%)</p>
            <p className="text-xl font-extrabold text-amber-600 mt-1">₹{Math.round((activeDraw?.total_pool || 0) * 0.40).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">🥈 Tier 2 (35%)</p>
            <p className="text-xl font-extrabold text-sky-700 mt-1">₹{Math.round((activeDraw?.total_pool || 0) * 0.35).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">🥉 Tier 3 (25%)</p>
            <p className="text-xl font-extrabold text-sky-700 mt-1">₹{Math.round((activeDraw?.total_pool || 0) * 0.25).toLocaleString()}</p>
          </div>
        </div>

        {/* Draw Management Console */}
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <div className="inline-flex items-center px-4 py-2 mb-4 text-sm font-bold tracking-wide uppercase bg-rose-50 rounded-lg text-rose-700">
            Draw Management Console
          </div>
          <h2 className="mb-4 text-2xl font-bold text-slate-800">Generate Monthly Draw</h2>
          <p className="max-w-2xl mb-6 font-medium leading-relaxed text-slate-500">
            Simulate draw logic before distributing live rewards.
          </p>

          {error && <div className="p-4 mb-4 text-sm bg-rose-50 rounded-xl text-rose-700">{error}</div>}
          {message && <div className="p-4 mb-4 text-sm text-emerald-700 bg-emerald-50 rounded-xl">{message}</div>}

          {activeDraw && activeDraw.status === 'draft' && (
            <div className="p-6 mb-6 border-2 border-amber-200 bg-amber-50 rounded-2xl">
              <h3 className="mb-4 text-lg font-bold text-amber-900">Active Draft Review</h3>
              <p className="mb-2 text-sm text-amber-800">Draw: {activeDraw.month}/{activeDraw.year} | Type: {activeDraw.type.toUpperCase()}</p>
              <div className="flex gap-3 mb-4">
                {activeDraw.draw_numbers.map((num: number, i: number) => (
                  <div key={i} className="flex items-center justify-center w-12 h-12 font-extrabold text-white shadow-sm bg-amber-600 rounded-xl">{num}</div>
                ))}
              </div>
              <p className="mb-4 text-sm font-semibold text-amber-800">Pool: ₹{activeDraw.total_pool.toLocaleString()}</p>
              <button onClick={handlePublish} disabled={isProcessing} className="px-6 py-3 font-semibold text-white transition bg-amber-600 shadow-md rounded-xl hover:bg-amber-700 disabled:opacity-60">
                {isProcessing ? 'Processing...' : 'Publish & Dispatch Rewards'}
              </button>
            </div>
          )}

          {activeDraw && activeDraw.status === 'published' && (
            <div className="p-6 mb-6 border border-emerald-200 bg-emerald-50 rounded-2xl">
              <h3 className="mb-2 text-lg font-bold text-emerald-800">Live Draw: {activeDraw.month}/{activeDraw.year}</h3>
              <p className="text-sm font-semibold text-emerald-700 mb-3">Published and distributed.</p>
              <div className="flex gap-3">
                {activeDraw.draw_numbers.map((num: number, i: number) => (
                  <div key={i} className="flex items-center justify-center w-10 h-10 font-bold text-white shadow-sm bg-emerald-500 rounded-xl">{num}</div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-slate-700">Month</label>
              <input type="number" min="1" max="12" value={drawMonth} onChange={e => setDrawMonth(Number(e.target.value))} className="w-full px-4 py-3 transition border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none shadow-sm" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-slate-700">Year</label>
              <input type="number" min="2024" max="2100" value={drawYear} onChange={e => setDrawYear(Number(e.target.value))} className="w-full px-4 py-3 transition border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none shadow-sm" />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-semibold text-slate-700">Model</label>
              <select value={drawType} onChange={e => setDrawType(e.target.value as any)} className="w-full px-4 py-3 transition border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none shadow-sm bg-white">
                <option value="random">Pure Randomness</option>
                <option value="algorithm">Algorithmic</option>
              </select>
            </div>
          </div>
          
          <button onClick={handleSimulate} disabled={isProcessing || (activeDraw?.status === 'draft')} className="w-full px-6 py-4 mt-6 font-semibold text-white transition-all shadow-sm bg-slate-900 rounded-xl hover:bg-slate-800 hover:shadow-[0_0_20px_rgba(14,165,233,0.3)] disabled:opacity-60">
            {isProcessing ? 'Executing Calculations...' : 'Execute Simulation Run ⚡'}
          </button>
        </div>

        {/* Winners Verification Console */}
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center px-4 py-2 text-sm font-bold tracking-wide uppercase bg-yellow-50 rounded-lg text-yellow-700">
              🏆 Winners Verification Console
            </div>
            <div className="flex gap-1.5">
              {(['all', 'pending', 'approved', 'paid'] as const).map(f => (
                <button key={f} onClick={() => setWinnerFilter(f)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${winnerFilter === f ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredWinners.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No winners found for this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 font-bold text-slate-500 uppercase text-xs">User</th>
                    <th className="text-center py-3 px-2 font-bold text-slate-500 uppercase text-xs">Matches</th>
                    <th className="text-center py-3 px-2 font-bold text-slate-500 uppercase text-xs">Prize</th>
                    <th className="text-center py-3 px-2 font-bold text-slate-500 uppercase text-xs">Proof</th>
                    <th className="text-center py-3 px-2 font-bold text-slate-500 uppercase text-xs">Status</th>
                    <th className="text-center py-3 px-2 font-bold text-slate-500 uppercase text-xs">Payment</th>
                    <th className="text-right py-3 px-2 font-bold text-slate-500 uppercase text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWinners.map((w) => (
                    <tr key={w.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2 font-semibold text-slate-700 text-xs" title={w.user_id}>
                        User {w.user_id.slice(0, 6)}
                        {w.match_count === 5 && <span className="ml-1.5 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full">🏆 JACKPOT</span>}
                      </td>
                      <td className="py-3 px-2 text-center font-extrabold text-slate-800">{w.match_count}</td>
                      <td className="py-3 px-2 text-center font-bold text-green-600">₹{w.prize_amount?.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center">
                        {w.proof_url ? (
                          <button onClick={() => setExpandedProof(w.proof_url!)} className="text-sky-500 font-bold text-xs hover:underline">View 📷</button>
                        ) : (
                          <span className="text-slate-300 text-xs">None</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          w.status === 'approved' ? 'bg-green-100 text-green-800' :
                          w.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {w.status === 'approved' ? '✅' : w.status === 'rejected' ? '❌' : '🟡'} {w.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          w.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {w.payment_status === 'paid' ? '💸 Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {w.status === 'pending' && (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    await updateWinnerStatus(w.id, 'approved')
                                    setWinners(prev => prev.map(p => p.id === w.id ? { ...p, status: 'approved' } : p))
                                    showToast({ type: 'success', message: 'Winner approved ✅' })
                                  } catch { showToast({ type: 'error', message: 'Action failed 😅' }) }
                                }}
                                className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors"
                              >Approve</button>
                              <button
                                onClick={async () => {
                                  try {
                                    await updateWinnerStatus(w.id, 'rejected')
                                    setWinners(prev => prev.map(p => p.id === w.id ? { ...p, status: 'rejected' } : p))
                                    showToast({ type: 'error', message: 'Submission rejected ❌' })
                                  } catch { showToast({ type: 'error', message: 'Action failed 😅' }) }
                                }}
                                className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                              >Reject</button>
                            </>
                          )}
                          {w.status === 'approved' && w.payment_status !== 'paid' && (
                            <button
                              onClick={async () => {
                                try {
                                  await markWinnerPaid(w.id)
                                  setWinners(prev => prev.map(p => p.id === w.id ? { ...p, payment_status: 'paid' } : p))
                                  showToast({ type: 'success', message: 'Payment completed 💸' })
                                } catch { showToast({ type: 'error', message: 'Action failed 😅' }) }
                              }}
                              className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                            >Mark Paid</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Management */}
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <div className="inline-flex items-center px-4 py-2 mb-2 text-sm font-bold tracking-wide uppercase bg-sky-50 rounded-lg text-sky-700">
            👥 User Management
          </div>
          {adminUsers.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 font-bold text-slate-500 uppercase text-xs">User ID</th>
                    <th className="text-left py-3 px-2 font-bold text-slate-500 uppercase text-xs">Email</th>
                    <th className="text-center py-3 px-2 font-bold text-slate-500 uppercase text-xs">Role</th>
                    <th className="text-center py-3 px-2 font-bold text-slate-500 uppercase text-xs">Subscription</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2 font-mono text-xs text-slate-600" title={u.id}>{u.id.slice(0, 8)}</td>
                      <td className="py-3 px-2 font-semibold text-slate-700 text-sm">{u.email || 'Anonymous Player 🎯'}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.subscription_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                          {u.subscription_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Charity Management */}
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center px-4 py-2 text-sm font-bold tracking-wide uppercase bg-green-50 rounded-lg text-green-700">
              🌱 Charity Management
            </div>
            <button
              onClick={() => { resetCharityForm(); setShowCharityForm(!showCharityForm) }}
              className="px-4 py-2 text-sm font-bold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              {showCharityForm ? 'Cancel' : '➕ Add Charity'}
            </button>
          </div>

          {/* Charity Form (Add / Edit) */}
          {showCharityForm && (
            <div className="p-5 bg-green-50/50 rounded-2xl border border-green-100 space-y-3">
              <h3 className="font-bold text-green-800">{editingCharity ? '✏️ Edit Charity' : '➕ New Charity'}</h3>
              <input
                value={charityForm.name} onChange={e => setCharityForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Charity Name" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
              />
              <input
                value={charityForm.short_description} onChange={e => setCharityForm(p => ({ ...p, short_description: e.target.value }))}
                placeholder="Short Description" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
              />
              <input
                value={charityForm.image_url} onChange={e => setCharityForm(p => ({ ...p, image_url: e.target.value }))}
                placeholder="Image URL or Emoji (e.g. 📚)" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
              />
              <input
                value={charityForm.impact_preview} onChange={e => setCharityForm(p => ({ ...p, impact_preview: e.target.value }))}
                placeholder="Impact Preview (e.g. meals delivered)" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
              />
              <input
                value={charityForm.why_matters} onChange={e => setCharityForm(p => ({ ...p, why_matters: e.target.value }))}
                placeholder="Why This Matters" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
              />
              <button
                onClick={handleSaveCharity} disabled={isSavingCharity}
                className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSavingCharity ? 'Saving...' : editingCharity ? 'Update Charity' : 'Create Charity'}
              </button>
            </div>
          )}

          {/* Charity List */}
          {charities.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No charities in database. Using fallback charities.</p>
          ) : (
            <div className="grid gap-3">
              {charities.map(c => (
                <div key={c.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white transition-colors">
                  <div className="text-3xl flex-shrink-0">
                    {c.image_url?.startsWith('http') ? (
                      <img src={c.image_url} alt={c.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <span>{c.image_url}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 truncate">{c.short_description}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => startEditCharity(c)} className="px-3 py-1.5 bg-sky-100 text-sky-700 text-xs font-bold rounded-lg hover:bg-sky-200 transition-colors">Edit</button>
                    <button onClick={() => handleDeleteCharity(c.id)} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Proof Image Modal */}
        {expandedProof && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setExpandedProof(null)}>
            <div className="max-w-2xl w-full p-4" onClick={(e) => e.stopPropagation()}>
              <img src={expandedProof} alt="Winner proof" className="w-full rounded-2xl shadow-2xl" />
              <button onClick={() => setExpandedProof(null)} className="mt-4 w-full py-3 bg-white rounded-xl font-bold text-slate-700">Close</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
