'use client'

import { useId, useState } from 'react'
import { ChevronDown, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatCount, formatDateTime } from '@/lib/utils/format'
import type { ContextSummary } from '@/lib/schemas'

interface SummarizedContextEntryProps {
  summary: ContextSummary
  className?: string
}

/**
 * The compaction moment, made visible: the messages that no longer fit the verbatim
 * budget, replaced in place by one `[Earlier: …]` line.
 *
 * Recessed and muted on purpose — it is context, not conversation. It renders
 * **before** the oldest verbatim message in DOM order (AB-05 asserts document
 * position, which is why the ordering is not done with CSS `order`).
 *
 * No seeded session overflows, so this has no fixture data at load; it is verified
 * against the live write path (see the plan's Task 24 recipe) and then reset.
 */
export function SummarizedContextEntry({ summary, className }: SummarizedContextEntryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const detailsId = useId()

  return (
    <div
      data-testid="summarized-context"
      className={cn(
        'border-border flex w-full min-w-0 flex-col gap-2 border-l-2 border-dashed',
        'bg-surface-1/50 py-3 pl-3',
        className,
      )}
    >
      <span className="text-eyebrow text-muted flex items-center gap-1 font-mono tracking-[0.08em] uppercase">
        <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
        Compacted
      </span>

      <p className="text-caption text-muted break-words">{summary.text}</p>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={detailsId}
        className={cn(
          'inline-flex items-center gap-1 self-start rounded-md',
          'text-eyebrow text-muted font-mono tracking-[0.08em] uppercase',
          'duration-fast hover:text-accent transition-colors',
        )}
      >
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className={cn('duration-fast transition-transform', isOpen ? 'rotate-0' : '-rotate-90')}
        />
        {isOpen ? 'Hide detail' : 'Show detail'}
      </button>

      <dl
        id={detailsId}
        hidden={!isOpen}
        className="text-caption text-muted grid grid-cols-[auto_1fr] gap-x-3 gap-y-1"
      >
        <dt>Messages covered</dt>
        <dd className="font-mono tabular-nums">{formatCount(summary.coversMessageIds.length)}</dd>

        <dt>Tokens</dt>
        <dd className="font-mono tabular-nums">
          {formatCount(summary.originalTokens)} → {formatCount(summary.summaryTokens)}
        </dd>

        <dt>Compacted at</dt>
        <dd className="font-mono tabular-nums">{formatDateTime(summary.createdAt)}</dd>
      </dl>
    </div>
  )
}
