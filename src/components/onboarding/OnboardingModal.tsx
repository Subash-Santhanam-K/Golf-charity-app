'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenOnboarding')
    if (hasSeen !== 'true') {
      setIsOpen(true)
    }
  }, [])

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true')
    setIsOpen(false)
  }

  const handleNext = () => setStep(s => Math.min(s + 1, 5))
  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  const steps = [
    { title: "Welcome to Your Golf Journey ⛳", text: "Play, compete, and make a real-world impact.", icon: "⛳" },
    { title: "Add Scores", text: "Track your last 5 rounds and improve your game.", icon: "🎯" },
    { title: "Monthly Draw", text: "Your scores enter you into monthly tournaments.", icon: "🏆" },
    { title: "Charity Impact ❤️", text: "Every game you play helps someone in need.", icon: "❤️" },
    { title: "Ready?", text: "Your adventure starts now. Let's make an impact globally.", icon: "🚀" }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div 
         initial={{ opacity: 0 }} 
         animate={{ opacity: 1 }} 
         exit={{ opacity: 0 }}
         className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      
      <motion.div 
         initial={{ opacity: 0, scale: 0.95, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         className="bg-white rounded-3xl shadow-xl border border-green-100 p-8 sm:p-10 max-w-lg w-full relative z-10 overflow-hidden"
      >
         <AnimatePresence mode="wait">
            <motion.div 
               key={step}
               initial={{ x: 50, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               exit={{ x: -50, opacity: 0 }}
               transition={{ duration: 0.3 }}
               className="text-center space-y-4"
            >
               <div className="text-7xl mb-6">{steps[step - 1].icon}</div>
               <h2 className="text-2xl font-extrabold text-slate-800">{steps[step - 1].title}</h2>
               <p className="text-slate-500 font-medium text-lg leading-relaxed h-16">{steps[step - 1].text}</p>
            </motion.div>
         </AnimatePresence>

         <div className="flex justify-center gap-2 my-8 pt-4">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className={`h-2.5 rounded-full transition-all duration-300 ${step === idx ? 'w-8 bg-sky-500 shadow-sm' : 'w-2.5 bg-slate-200'}`} />
            ))}
         </div>

         <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button 
              onClick={handleComplete} 
              className="text-slate-400 font-bold hover:text-slate-600 transition-colors"
            >
              Skip
            </button>
            <div className="flex items-center gap-3">
               {step > 1 && (
                 <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleBack} className="px-5 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl transition-colors hover:bg-slate-200">Back</motion.button>
               )}
               {step < 5 ? (
                 <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleNext} className="px-8 py-3 bg-sky-400 text-white font-extrabold rounded-xl drop-shadow-sm border-b-4 border-sky-500 active:border-b-0 active:translate-y-1 transition-all">Next</motion.button>
               ) : (
                 <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleComplete} className="px-6 py-3 bg-green-500 text-white font-extrabold rounded-xl drop-shadow-sm border-b-4 border-green-600 active:border-b-0 active:translate-y-1 transition-all">Let's get started 🚀</motion.button>
               )}
            </div>
         </div>
      </motion.div>
    </div>
  )
}
