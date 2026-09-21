'use client'

import { useId } from 'react'
import { Meter } from '@/components/ui/Meter'
import { cn } from '@/lib/utils/cn'
import { formatCount, formatTokenBudget } from '@/lib/utils/format'
import type { SessionMemoryState } from '@/lib/schemas'

interface SessionMemoryMeterProps {
  sessionMemory: SessionMemoryState
  className?: string
}

/**
 * The session's token budget, made visible — the thing this product is actually about.
 *
 * Filled = verbatim tokens, hatched = tokens that were compacted into a summary,
 * remainder = free budget.
 *
 * **The readout is a sibling of the meter, not a child.** Browsers force every
 * descendant of `role="meter"` to `role="presentation"`, so nesting the
 * `1,847 / 2,000 tokens` text would erase it from the accessibility tree and Phase 4
 * would not be able to read it. It is wired up with `aria-labelledby` instead, and
 * duplicated into `aria-valuetext`.
 *
 * `aria-valuenow` is `verbatimTokens` as a raw number. It can legitimately exceed the
 * *effective* budget (budget − reserve): the pair-split rule is allowed to overshoot
 * and the reserve absorbs it. It never exceeds `aria-valuemax`.
 */
export function SessionMemoryMeter({ sessionMemory, className }: SessionMemoryMeterProps) {
  const labelId = useId()
  const { verbatimTokens, summarizedTokens, budgetTokens } = sessionMemory

  const readout = `${formatTokenBudget(verbatimTokens, budgetTokens)} · verbatim`

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <Meter
        value={verbatimTokens}
        max={budgetTokens}
        secondaryValue={summarizedTokens}
        valueText={readout}
        labelledBy={labelId}
        tone="accent"
        testId="session-memory-meter"
      />
      <span
        id={labelId}
        className="text-eyebrow text-muted font-mono tracking-[0.08em] uppercase tabular-nums"
      >
        {readout}
        {summarizedTokens > 0 ? ` · ${formatCount(summarizedTokens)} compacted` : ''}
      </span>
    </div>
  )
}
