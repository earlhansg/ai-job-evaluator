'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils/cn'

type MeterTone = 'accent' | 'match' | 'partial' | 'mismatch'

const BAR_FILL = {
  accent: 'fill-accent',
  match: 'fill-match',
  partial: 'fill-partial',
  mismatch: 'fill-mismatch',
} as const satisfies Record<MeterTone, string>

const DOT_FILL = {
  accent: 'bg-accent',
  match: 'bg-match',
  partial: 'bg-partial',
  mismatch: 'bg-mismatch',
} as const satisfies Record<MeterTone, string>

interface MeterProps {
  /** Raw number for `aria-valuenow`. Phase 4 reads this numerically — never a string. */
  value: number
  max: number
  /** The human rendering, e.g. `1,847 / 2,000 tokens`. Also the visible sibling's text. */
  valueText: string
  /** Accessible name. Use this **or** `labelledBy`, never neither. */
  label?: string
  /** id of a visible label rendered as a **sibling** — see the descendants note below. */
  labelledBy?: string
  /** A second, hatched segment stacked after `value` (compacted tokens). */
  secondaryValue?: number
  /** `bar` for a continuous budget; `dots` for a coarse 1..max rating. */
  shape?: 'bar' | 'dots'
  tone?: MeterTone
  /** Lands on the `role="meter"` element itself, so Phase 4 reads `aria-valuenow` off it. */
  testId?: string
  className?: string
}

/**
 * A bounded measurement — `role="meter"`, not `progressbar`. A progressbar represents a
 * task advancing toward completion; the token budget and a confidence rating are static
 * measurements within a known range.
 *
 * **Everything inside a `meter` is forced to `role="presentation"` by the browser.** So
 * the bar geometry lives inside (it is decoration) and the readable value must be a
 * *sibling* referenced by `labelledBy`. Nesting the readout erases it from the
 * accessibility tree and agent-browser stops being able to see it.
 *
 * Geometry is expressed as SVG attributes rather than inline styles: the `width` of a
 * `<rect>` in a `0 0 100 …` viewBox *is* the percentage, so nothing themeable escapes
 * into a `style` prop.
 */
export function Meter({
  value,
  max,
  valueText,
  label,
  labelledBy,
  secondaryValue = 0,
  shape = 'bar',
  tone = 'accent',
  testId,
  className,
}: MeterProps) {
  const rawId = useId()
  // `useId` output contains characters that are awkward inside `url(#…)`; strip them.
  const hatchId = `meter-hatch-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  const safeMax = max > 0 ? max : 1
  const primaryPct = clampPct((value / safeMax) * 100)
  const secondaryPct = clampPct((secondaryValue / safeMax) * 100, 100 - primaryPct)

  const aria = {
    role: 'meter' as const,
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-valuetext': valueText,
    'aria-label': labelledBy ? undefined : label,
    'aria-labelledby': labelledBy,
    'data-testid': testId,
  }

  // Filled dots are solid accent; empty dots are a 70%-accent outline rather than a
  // `track`-coloured one. `track` is a mid-tone and measures 2.99:1 on a fact card —
  // just under 1.4.11's 3:1 — while accent/70 measures 3.94:1 and reads as the same
  // mark, dimmed.
  if (shape === 'dots') {
    return (
      <div {...aria} className={cn('inline-flex items-center gap-1', className)}>
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={cn(
              'size-2 rounded-full',
              i < value ? DOT_FILL[tone] : 'ring-accent/70 bg-transparent ring-1',
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      {...aria}
      className={cn(
        'border-border bg-surface-2 h-2 w-full overflow-hidden rounded-full border',
        className,
      )}
    >
      <svg
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="block h-full w-full"
      >
        <defs>
          {/* Compacted tokens read as "still counted, but no longer verbatim". Hatching
              carries that without spending a second color on it. */}
          <pattern
            id={hatchId}
            width="4"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="8" className="fill-surface-2" />
            <rect width="2" height="8" className="fill-accent/80" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={primaryPct} height="8" className={BAR_FILL[tone]} />
        {secondaryPct > 0 ? (
          <rect x={primaryPct} y="0" width={secondaryPct} height="8" fill={`url(#${hatchId})`} />
        ) : null}
      </svg>
    </div>
  )
}

function clampPct(n: number, ceiling = 100): number {
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, ceiling)
}
