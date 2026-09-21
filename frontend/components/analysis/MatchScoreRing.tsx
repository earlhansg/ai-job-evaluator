import { cn } from '@/lib/utils/cn'
import { formatScore } from '@/lib/utils/format'
import type { Verdict } from '@/lib/schemas'

const VERDICT_STROKE = {
  'strong-match': 'stroke-match',
  'partial-match': 'stroke-partial',
  'not-recommended': 'stroke-mismatch',
} as const satisfies Record<Verdict, string>

const VERDICT_LABEL = {
  'strong-match': 'strong match',
  'partial-match': 'partial match',
  'not-recommended': 'not recommended',
} as const satisfies Record<Verdict, string>

interface MatchScoreRingProps {
  /** Integer 0–100. Not a percentage — no `%` is rendered. */
  score: number
  verdict: Verdict
  className?: string
}

/**
 * The card's hero numeral.
 *
 * `pathLength={100}` normalizes the arc math so the dash pattern is expressed directly
 * in score units — no `2πr` constant ends up in JSX. The numeral is HTML rather than
 * SVG `<text>` so it can use the real type ramp, and it is `aria-hidden` because the
 * `role="img"` label already announces the score (AB-03 matches
 * `/Match score \d+ out of 100/`).
 */
export function MatchScoreRing({ score, verdict, className }: MatchScoreRingProps) {
  return (
    <div
      className={cn('relative inline-flex size-24 shrink-0 items-center justify-center', className)}
    >
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Match score ${formatScore(score)} out of 100, ${VERDICT_LABEL[verdict]}`}
        className="size-full"
      >
        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-surface-2" />
        {/* `strokeLinecap="round"` adds half a stroke width at each end, so a zero score
            would still render a visible dot. Omit the arc entirely instead. */}
        {score > 0 ? (
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - score}
            transform="rotate(-90 50 50)"
            className={VERDICT_STROKE[verdict]}
          />
        ) : null}
      </svg>
      <span
        aria-hidden="true"
        className="text-metric text-text absolute font-mono font-medium tabular-nums"
      >
        {formatScore(score)}
      </span>
    </div>
  )
}
