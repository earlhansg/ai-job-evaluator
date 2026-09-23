'use client'

import { createContext, use } from 'react'

/**
 * The app-wide toast API. Provided by `ToastProvider` in `app/providers.tsx`: a toast
 * may outlive a route change, so it cannot live under the workspace layout.
 *
 * `memory` is the only kind this phase — toasts announce memory writes and nothing
 * else. A load failure is never a toast (`design-system.md` §12); it is a panel error.
 */
export interface ToastApi {
  memory: (message: string) => void
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = use(ToastContext)
  if (!api) throw new Error('useToast must be called inside <ToastProvider>')
  return api
}
