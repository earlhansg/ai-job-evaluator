import { Brain } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatCount, formatDateTime, formatRelativeTime } from '@/lib/utils/format'

interface MemoryStatsHeaderProps {
  factCount: number
  /** Number of categories currently holding at least one fact. */
  categoryCount: number
  /** Most recent `updatedAt` across all facts. */
  updatedAt: string
  className?: string
}

/** The panel's "what does it know about me" summary. AB targets `memory-stats`. */
export function MemoryStatsHeader({
  factCount,
  categoryCount,
  updatedAt,
  className,
}: MemoryStatsHeaderProps) {
  return (
    <div
      data-testid="memory-stats"
      className={cn(
        'border-border bg-surface-1 flex flex-col gap-2 rounded-xl border p-4',
        className,
      )}
    >
      <span className="text-eyebrow text-muted flex items-center gap-1 font-mono tracking-[0.08em] uppercase">
        <Brain size={16} strokeWidth={1.75} aria-hidden="true" />
        Remembered
      </span>

      <div className="flex items-baseline gap-2">
        <span className="text-metric text-text font-mono font-medium tabular-nums">
          {formatCount(factCount)}
        </span>
        <span className="text-caption text-muted">
          {factCount === 1 ? 'fact' : 'facts'} across{' '}
          <span className="font-mono tabular-nums">{formatCount(categoryCount)}</span>{' '}
          {categoryCount === 1 ? 'category' : 'categories'}
        </span>
      </div>

      <span className="text-caption text-muted" title={formatDateTime(updatedAt)}>
        Last updated {formatRelativeTime(updatedAt)}
      </span>
    </div>
  )
}
