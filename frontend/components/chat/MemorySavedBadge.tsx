'use client'

import { useMemoryActivity } from '@/hooks/useMemoryActivity'
import { cn } from '@/lib/utils/cn'
import { factLabelFromEffect } from '@/lib/utils/memory-effect'

interface MemorySavedBadgeProps {
  factId: string
  /** The effect label, e.g. `Saved to memory — TypeScript`. */
  label: string
  className?: string
}

/**
 * The persistent save-to-memory cue on an assistant message. Outlives the toast.
 *
 * A button rather than a static pill: that gives it a real role and a stable accessible
 * name, and it is a third way into "show me that fact" in Panel 3.
 *
 * The accessible name is PRD §7.6's `Saved to long-term memory: <fact label>`, verbatim,
 * because Phase 4 asserts it. It does not contain the visible text "Saved to memory"
 * contiguously (a WCAG 2.5.3 label-in-name tension). That is a recorded deviation; do
 * not "fix" it here.
 *
 * The rise animation is one-shot with `both` fill, so with reduced motion the badge is
 * simply present.
 */
export function MemorySavedBadge({ factId, label, className }: MemorySavedBadgeProps) {
  const { showFact } = useMemoryActivity()
  const factLabel = factLabelFromEffect(label)

  return (
    <button
      type="button"
      onClick={() => showFact(factId)}
      data-testid="memory-saved-badge"
      data-memory-effect={factId}
      aria-label={`Saved to long-term memory: ${factLabel}`}
      className={cn(
        'animate-memory-rise inline-flex items-center gap-1 rounded-full border px-2 py-1',
        'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20',
        'text-eyebrow font-mono tracking-[0.08em] uppercase',
        'duration-fast transition-colors',
        className,
      )}
    >
      <span aria-hidden="true" className="bg-accent size-2 rounded-full" />
      Saved to memory
    </button>
  )
}
