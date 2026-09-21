'use client'

import Link from 'next/link'
import { ArrowRight, Pin } from 'lucide-react'
import { ConfidenceMeter } from '@/components/memory/ConfidenceMeter'
import { cn } from '@/lib/utils/cn'
import { formatCount, formatDateTime } from '@/lib/utils/format'
import type { MemoryFact } from '@/lib/schemas'

interface MemoryFactCardProps {
  fact: MemoryFact
  className?: string
}

/**
 * One durable fact.
 *
 * Pin and delete *controls* are Phase 3 — the pinned **state** is rendered here (three
 * seeded facts are pinned) as an icon plus the word "Pinned", never as colour alone.
 */
export function MemoryFactCard({ fact, className }: MemoryFactCardProps) {
  return (
    <article
      className={cn(
        'border-border bg-surface-1 flex flex-col gap-2 rounded-xl border p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-title text-text min-w-0 font-medium break-words">{fact.label}</h4>
        {fact.pinned ? (
          <span className="text-caption text-accent inline-flex shrink-0 items-center gap-1">
            <Pin size={16} strokeWidth={1.75} aria-hidden="true" />
            Pinned
          </span>
        ) : null}
      </div>

      <p className="text-body text-text break-words">{fact.value}</p>

      <div className="flex flex-wrap items-center gap-3">
        <ConfidenceMeter confidence={fact.confidence} />
        <span className="text-caption text-muted">
          Cited in <span className="font-mono tabular-nums">{formatCount(fact.hitCount)}</span>{' '}
          {fact.hitCount === 1 ? 'evaluation' : 'evaluations'}
        </span>
      </div>

      <Link
        href={`/c/${fact.source.sessionId}`}
        aria-label={`Open the session this fact came from: ${fact.label}`}
        title={`Learned ${formatDateTime(fact.createdAt)} · updated ${formatDateTime(fact.updatedAt)}`}
        className={cn(
          'text-eyebrow inline-flex items-center gap-1 self-start font-mono tracking-[0.08em] uppercase',
          'text-muted duration-fast hover:text-accent transition-colors',
        )}
      >
        {fact.source.sessionId}
        <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </article>
  )
}
