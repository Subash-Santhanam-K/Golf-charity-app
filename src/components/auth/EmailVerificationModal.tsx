'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/useToast'

interface Props {
  isOpen: boolean
  email: string
  onClose: () => void
  onChangeEmail?: () => void
}

export function EmailVerificationModal({ isOpen, email, onClose, onChangeEmail }: Props) {
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const { showToast } = useToast()

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || isResending) return
    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) {
        showToast({ type: 'error', message: error.message || 'Could not resend. Please try again.' })
      } else {
        showToast({ type: 'success', message: '📩 Verification email sent again!' })
        setResendCooldown(30)
      }
    } catch {
      showToast({ type: 'error', message: 'Something went wrong. Please try again.' })
    }
    setIsResending(false)
  }, [email, resendCooldown, isResending, showToast])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 max-w-md w-full relative z-10 text-center space-y-5 border border-green-100"
          >
            {/* Animated Golf Icon */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="text-7xl"
            >
              ⛳
            </motion.div>

            {/* Heading */}
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800">
              Check Your Inbox 📩
            </h2>

            {/* Message */}
            <p className="text-slate-600 font-medium leading-relaxed">
              We've sent a verification link to{' '}
              <span className="font-bold text-sky-500">{email}</span>.
              <br />
              Confirm your account to start playing and making an impact.
            </p>

            {/* Emotional subtext */}
            <p className="text-sm text-slate-400 font-bold italic">
              Every round you play helps someone ❤️
            </p>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              {/* Open Email */}
              <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="block">
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)' }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full bg-sky-400 text-white py-3.5 rounded-xl font-extrabold text-lg border-b-4 border-sky-500 active:border-b-0 active:translate-y-1 transition-all"
                >
                  Open Email App 📬
                </motion.button>
              </a>

              {/* Resend */}
              <motion.button
                whileHover={resendCooldown <= 0 ? { scale: 1.03 } : {}}
                whileTap={resendCooldown <= 0 ? { scale: 0.97 } : {}}
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending
                  ? 'Sending...'
                  : resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : 'Resend Verification Email'}
              </motion.button>

              {/* Change Email */}
              {onChangeEmail && (
                <button
                  onClick={onChangeEmail}
                  className="text-sm text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  Change Email Address
                </button>
              )}
            </div>

            {/* Close hint */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-colors font-bold text-xl"
              aria-label="Close"
            >
              ✕
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
