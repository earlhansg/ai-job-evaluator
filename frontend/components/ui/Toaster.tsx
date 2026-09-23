'use client'

import { Brain, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ToastItem } from '@/lib/utils/toast-queue'

interface ToasterProps {
  toasts: readonly ToastItem[]
  onDismiss: (id: string) => void
  className?: string
}

/**
 * The toast stack.
 *
 * The container is the live region, and it is **always mounted**: a live region must
 * exist before its content changes, or the first announcement is lost. Items carry no
 * role of their own. Inserting an already-populated `role="status"` is often not
 * announced, and one region per toast would multiply the page's live regions. The
 * transcript's `role="log"` and this container are the only two.
 *
 * Elevation level 3 (floating), so this is one of the few places `shadow-lg` is
 * allowed. `z-40` sits below `Drawer`'s `z-50`; a modal `<dialog>` is in the top layer
 * regardless, so a toast raised while a drawer is open is hidden behind it.
 */
export function Toaster({ toasts, onDismiss, className }: ToasterProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Notifications"
      className={cn(
        'pointer-events-none fixed inset-x-4 bottom-4 z-40 flex flex-col items-end gap-2',
        'sm:inset-x-auto sm:end-4',
        className,
      )}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          data-testid="memory-toast"
          className={cn(
            'animate-toast-in pointer-events-auto flex w-full max-w-80 items-start gap-2',
            'border-border bg-surface-2 rounded-xl border p-3 shadow-lg',
          )}
        >
          <Brain
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="text-accent mt-1 shrink-0"
          />
          <p className="text-body text-text min-w-0 flex-1 break-words">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className={cn(
              'inline-flex size-6 shrink-0 items-center justify-center rounded-md',
              'text-muted duration-fast hover:text-accent transition-colors',
            )}
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
