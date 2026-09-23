'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Toaster } from '@/components/ui/Toaster'
import { ToastContext, type ToastApi } from '@/hooks/useToast'
import { TOAST_DURATION_MS, pushToast, removeToast, type ToastItem } from '@/lib/utils/toast-queue'

interface ToastProviderProps {
  children: React.ReactNode
}

/**
 * Owns the toast list and its timers. The list rules (cap, removal) are pure and live
 * in `lib/utils/toast-queue.ts`.
 *
 * `memory()` runs in the caller's event or mutation callback, never during render, so
 * the id counter and `setTimeout` are safe here.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts((list) => removeToast(list, id))
  }, [])

  const memory = useCallback(
    (message: string) => {
      counter.current += 1
      const id = `toast_${counter.current}`
      setToasts((list) => pushToast(list, { id, message }))
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_DURATION_MS),
      )
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
    }
  }, [])

  const api = useMemo<ToastApi>(() => ({ memory, dismiss }), [memory, dismiss])

  return (
    <ToastContext value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  )
}
