import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface PanelErrorProps {
  /** One human-readable line. Never the raw exception. */
  message: string
  onRetry: () => void
  className?: string
}

/**
 * Inline, in place — never a toast. `design-system.md` §12: "toasts are for things that
 * succeeded." A load failure has to stay where the missing content is, with the retry
 * next to it.
 */
export function PanelError({ message, onRetry, className }: PanelErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'border-border bg-surface-1 flex flex-col items-start gap-3 rounded-xl border p-4',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <CircleAlert
          size={16}
          strokeWidth={1.75}
          className="text-mismatch mt-1 shrink-0"
          aria-hidden="true"
        />
        <p className="text-body text-text">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          'border-border bg-surface-2 text-caption text-text rounded-md border px-3 py-1',
          'duration-fast hover:border-accent hover:text-accent transition-colors',
        )}
      >
        Retry
      </button>
    </div>
  )
}
