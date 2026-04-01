'use client'
import { ReactNode } from 'react'
import { ToastProvider } from '@/hooks/useToast'
import { ToastCenter } from '@/components/ui/ToastCenter'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastCenter />
    </ToastProvider>
  )
}
