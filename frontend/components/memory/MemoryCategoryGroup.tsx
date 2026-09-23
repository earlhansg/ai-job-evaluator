'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { MemoryFactCard } from '@/components/memory/MemoryFactCard'
import { useMemoryActivity } from '@/hooks/useMemoryActivity'
import { cn } from '@/lib/utils/cn'
import { formatCount } from '@/lib/utils/format'
import type { MemoryFact } from '@/lib/schemas'

interface MemoryCategoryGroupProps {
  /** Display name for the category, e.g. `Dealbreakers`. */
  label: string
  facts: MemoryFact[]
  onFactDeleted: () => void
  onDeleteError: (message: string) => void
  className?: string
}

/**
 * A collapsible category.
 *
 * The open/closed flag is genuinely view state — it belongs in local `useState`, not in
 * the URL and not in SWR. The toggle is a real `<button>` with `aria-expanded`; a
 * clickable `<div>` would be invisible to the Phase 4 harness.
 *
 * A group holding the highlighted fact is force-expanded for the highlight window.
 * That is derived (`isOpen || containsHighlight`), not written back into state from an
 * effect, so the user's own open/closed choice survives it.
 */
export function MemoryCategoryGroup({
  label,
  facts,
  onFactDeleted,
  onDeleteError,
  className,
}: MemoryCategoryGroupProps) {
  const [isOpen, setIsOpen] = useState(true)
  const contentId = useId()
  const { highlight } = useMemoryActivity()
  const containsHighlight = !!highlight && facts.some((fact) => fact.id === highlight.factId)
  const isExpanded = isOpen || containsHighlight

  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-md px-1 py-1',
          'duration-fast hover:bg-surface-1 transition-colors',
        )}
      >
        <span className="flex items-center gap-2">
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className={cn(
              'text-muted duration-fast transition-transform',
              isExpanded ? 'rotate-0' : '-rotate-90',
            )}
          />
          <span className="text-eyebrow text-muted font-mono tracking-[0.08em] uppercase">
            {label}
          </span>
        </span>
        <Badge>{formatCount(facts.length)}</Badge>
      </button>

      <div id={contentId} hidden={!isExpanded} className="flex flex-col gap-2">
        {facts.map((fact) => (
          <MemoryFactCard
            key={fact.id}
            fact={fact}
            onDeleted={onFactDeleted}
            onDeleteError={onDeleteError}
          />
        ))}
      </div>
    </section>
  )
}
