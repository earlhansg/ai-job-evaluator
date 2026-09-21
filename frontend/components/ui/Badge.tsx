import { cn } from '@/lib/utils/cn'

/** `satisfies` below turns a widened union into a compile error rather than a silent gap. */
type BadgeTone = 'neutral' | 'match' | 'mismatch' | 'partial' | 'accent'

const TONE_STYLES = {
  neutral: 'border-border bg-surface-2 text-muted',
  match: 'border-match/30 bg-match/10 text-match',
  mismatch: 'border-mismatch/30 bg-mismatch/10 text-mismatch',
  partial: 'border-partial/30 bg-partial/10 text-partial',
  accent: 'border-accent/30 bg-accent/10 text-accent',
} as const satisfies Record<BadgeTone, string>

interface BadgeProps {
  children: React.ReactNode
  tone?: BadgeTone
  className?: string
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-1',
        'text-eyebrow font-mono tracking-[0.08em] uppercase tabular-nums',
        TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
