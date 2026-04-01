'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/hooks/useToast'

export function ToastCenter() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const colors = {
            success: 'border-green-400 text-green-800 bg-green-50/95',
            error: 'border-red-400 text-red-800 bg-red-50/95',
            info: 'border-sky-400 text-sky-800 bg-sky-50/95'
          }
          const icons = {
            success: '✅',
            error: '😅',
            info: 'ℹ️'
          }
          
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              whileHover={{ scale: 1.02 }}
              className={`pointer-events-auto flex items-center gap-3 backdrop-blur-md p-4 rounded-2xl shadow-xl border-l-4 ${colors[toast.type]} min-w-[300px] max-w-sm`}
            >
              <div className="text-xl">{icons[toast.type]}</div>
              <p className="font-bold flex-1">{toast.message}</p>
              <button 
                 onClick={() => removeToast(toast.id)} 
                 className="text-slate-400 hover:text-slate-600 font-bold px-2 rounded-full transition-colors"
                 aria-label="Close Notification"
              >
                ✕
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
