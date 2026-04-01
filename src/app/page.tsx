'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function HomePage() {
  return (
    <div className="min-h-screen p-6 flex items-center justify-center bg-golf-texture relative">
      <div className="max-w-5xl mx-auto w-full space-y-6 text-center z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass-card p-8 md:p-14 space-y-6 relative overflow-hidden"
        >
          {/* Subtle floating background icon for depth */}
          <div className="absolute top-[-20%] right-[-10%] text-[15rem] opacity-5 pointer-events-none transform -rotate-12">
            ⛳
          </div>

          <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ delay: 0.2, duration: 0.5 }}
             className="inline-block px-4 py-2 bg-green-50 text-green-700 font-bold rounded-full text-sm border border-green-200 mb-2"
          >
             Charity Golf Sweepstakes 🚩
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-800 tracking-tight">
            Play. Win. <span className="text-sky-500">Make an Impact ❤️</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-2xl mx-auto">
            Every round you play helps change lives. Connect your love for the game with real-world charitable impact.
          </p>
          
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-8"
          >
            <Link href="/signup" className="w-full sm:w-auto">
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: "0px 10px 20px rgba(56, 189, 248, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-10 py-4 bg-sky-400 text-white rounded-xl font-bold text-lg shadow-md border-b-4 border-sky-500"
              >
                Play Your Shot ⛳
              </motion.button>
            </Link>

            <Link href="/login" className="w-full sm:w-auto">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-10 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold text-lg hover:bg-slate-200 transition-colors border-b-4 border-slate-200"
              >
                View Leaderboard 🏆
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
        
      </div>
    </div>
  )
}