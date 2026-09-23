'use client'

import { useEffect, useId, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Pin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { ConfidenceMeter } from '@/components/memory/ConfidenceMeter'
import { MemoryFactActions } from '@/components/memory/MemoryFactActions'
import { useMemoryActivity } from '@/hooks/useMemoryActivity'
import { cn } from '@/lib/utils/cn'
import { formatCount, formatDateTime } from '@/lib/utils/format'
import type { MemoryAction, MemoryFact } from '@/lib/schemas'

/** `reinforced` reads as an update to the user: the fact was already known. */
const ACTION_CHIP = {
  created: 'New',
  updated: 'Updated',
  reinforced: 'Updated',
} as const satisfies Record<MemoryAction, string>

interface MemoryFactCardProps {
  fact: MemoryFact
  onDeleted: () => void
  onDeleteError: (message: string) => void
  className?: string
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * One durable fact.
 *
 * The pinned **state** is an icon plus the word "Pinned", never colour alone. The pin
 * and delete **controls** live in `MemoryFactActions`.
 *
 * Memory cues (PRD §7.4):
 *  - A `New` / `Updated` chip for any fact touched by a memory effect this visit.
 *  - A 2s accent ring flash when an effect lands or when something in Panel 2 asks to
 *    show this fact. Each overlay's `key` changes per event, which remounts it and
 *    replays the animation. The two sources get separate overlays: sharing one would
 *    change its key when the highlight clears and replay the effect flash.
 *  - On a show request the card scrolls into view and takes focus. That is deferred a
 *    frame: below 1280px this effect runs before the parent `Drawer`'s `showModal()`,
 *    while the dialog is still `display: none`, and `scrollIntoView` would do nothing.
 *
 * A pin toggle is not a memory effect, so it neither chips nor flashes.
 */
export function MemoryFactCard({ fact, onDeleted, onDeleteError, className }: MemoryFactCardProps) {
  const { recent, highlight } = useMemoryActivity()
  const ref = useRef<HTMLElement>(null)
  const titleId = useId()

  const recentAction = recent[fact.id]
  const highlightNonce = highlight?.factId === fact.id ? highlight.nonce : null

  useEffect(() => {
    if (highlight?.factId !== fact.id) return
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({
        block: 'center',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
      ref.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [highlight, fact.id])

  return (
    <article
      ref={ref}
      tabIndex={-1}
      aria-labelledby={titleId}
      data-testid="memory-fact"
      data-fact-id={fact.id}
      className={cn(
        'border-border bg-surface-1 relative flex flex-col gap-2 rounded-xl border p-4',
        className,
      )}
    >
      {recentAction ? <FlashRing key={`r${recentAction.at}`} /> : null}
      {highlightNonce !== null ? <FlashRing key={`h${highlightNonce}`} /> : null}

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h4 id={titleId} className="text-title text-text min-w-0 font-medium break-words">
            {fact.label}
          </h4>
          {recentAction ? (
            <span data-testid="memory-fact-chip" className="inline-flex">
              <Badge tone="accent">{ACTION_CHIP[recentAction.action]}</Badge>
            </span>
          ) : null}
          {fact.pinned ? (
            <span className="text-caption text-accent inline-flex shrink-0 items-center gap-1">
              <Pin size={16} strokeWidth={1.75} aria-hidden="true" />
              Pinned
            </span>
          ) : null}
        </div>
        <MemoryFactActions fact={fact} onDeleted={onDeleted} onDeleteError={onDeleteError} />
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

/** Co-located: the 2s hold-then-fade ring. Remount (a new `key`) to replay. */
function FlashRing() {
  return (
    <span
      aria-hidden="true"
      className="ring-accent animate-fact-flash pointer-events-none absolute inset-0 rounded-xl ring-2"
    />
  )
}
