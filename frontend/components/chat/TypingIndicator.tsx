import { cn } from '@/lib/utils/cn'

interface TypingIndicatorProps {
  className?: string
}

/**
 * Shown while a send is pending. The dots are decoration (`typing-dot` is the one
 * sanctioned loop); the text is real, so the enclosing `role="log"` announces
 * "Evaluating…" once. It has no live region of its own.
 *
 * With reduced motion the dots hold still and the text still shows.
 */
export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div
      data-testid="typing-indicator"
      className={cn(
        'bg-surface-2 flex items-center gap-2 self-start rounded-2xl px-4 py-3',
        className,
      )}
    >
      <span aria-hidden="true" className="flex gap-1">
        <span className="bg-accent animate-typing-dot size-2 rounded-full" />
        <span className="bg-accent animate-typing-dot size-2 rounded-full [animation-delay:var(--duration-fast)]" />
        <span className="bg-accent animate-typing-dot size-2 rounded-full [animation-delay:var(--duration-base)]" />
      </span>
      <span className="text-caption text-muted">Evaluating…</span>
    </div>
  )
}
