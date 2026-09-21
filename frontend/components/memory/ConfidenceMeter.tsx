'use client'

import { Meter } from '@/components/ui/Meter'
import { cn } from '@/lib/utils/cn'

type ConfidenceLevel = 'low' | 'medium' | 'high'

const LEVEL_DOTS = { low: 1, medium: 2, high: 3 } as const satisfies Record<ConfidenceLevel, number>

/**
 * Thresholds chosen against the real spread of the seeded facts (0.61 → 0.98): they
 * split 12 facts into 6 high / 3 medium / 3 low. A threshold set that renders every
 * fact "high" communicates nothing.
 */
function toLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.9) return 'high'
  if (confidence >= 0.75) return 'medium'
  return 'low'
}

interface ConfidenceMeterProps {
  /** 0–1 from the store. **Never rendered numerically** — `design-system.md` §10. */
  confidence: number
  className?: string
}

/**
 * Three dots, never `0.98`.
 *
 * The dots use `accent`, not a status color: `match`/`partial`/`mismatch` mean
 * *evaluation outcome* and nothing else (`design-system.md` §6). The level is carried
 * by how many dots are filled plus the accessible name — not by hue.
 *
 * A native `title` rather than the `Tooltip` primitive: the level is already the
 * meter's accessible name, so wrapping it in a focusable tooltip trigger would add an
 * unnamed tab stop that announces the same string a second time. `title` gives sighted
 * mouse users the label with nothing else changed.
 */
export function ConfidenceMeter({ confidence, className }: ConfidenceMeterProps) {
  const level = toLevel(confidence)
  const label = `Confidence: ${level}`

  return (
    <span title={label} className={cn('inline-flex', className)}>
      <Meter
        value={LEVEL_DOTS[level]}
        max={3}
        valueText={label}
        label={label}
        shape="dots"
        tone="accent"
      />
    </span>
  )
}
