'use client'

import { Brain } from 'lucide-react'
import { ShowFactButton } from '@/components/analysis/ShowFactButton'
import { cn } from '@/lib/utils/cn'
import type { MemoryCitation } from '@/lib/schemas'

interface MemoryCitationListProps {
  citations: MemoryCitation[]
  className?: string
}

/**
 * The stored preferences this verdict leaned on — the product's whole argument that
 * the assistant actually remembers you.
 *
 * Rendered as chips (PRD §7.3) carrying both the fact label and its value: a chip that
 * only showed `f_no_onsite` would prove the citation exists without showing what it
 * said, which is the part that matters.
 *
 * Each chip is a `ShowFactButton`: activating it scrolls Panel 3 to the cited fact and
 * flashes it. The padding sits on the button rather than the `li`, so the whole chip is
 * the hit target.
 */
export function MemoryCitationList({ citations, className }: MemoryCitationListProps) {
  if (citations.length === 0) return null

  return (
    <div className={cn('border-border flex min-w-0 flex-col gap-2 border-t pt-4', className)}>
      <h4 className="text-eyebrow text-muted flex items-center gap-1 font-mono tracking-[0.08em] uppercase">
        <Brain size={16} strokeWidth={1.75} aria-hidden="true" />
        Based on your saved memory
      </h4>
      <ul className="flex min-w-0 flex-wrap gap-2">
        {citations.map((citation) => (
          <li
            key={citation.factId}
            title={citation.factId}
            className={cn(
              'border-border flex max-w-full min-w-0 flex-col gap-1 rounded-md border',
              'bg-surface-2',
            )}
          >
            <ShowFactButton
              factId={citation.factId}
              accessibleName={`Show saved fact: ${citation.label}`}
              className="flex max-w-full min-w-0 flex-col items-start gap-1 px-2 py-1 text-start"
            >
              <span className="text-caption text-text font-medium">{citation.label}</span>
              <span className="text-caption text-muted break-words">{citation.value}</span>
            </ShowFactButton>
          </li>
        ))}
      </ul>
    </div>
  )
}
