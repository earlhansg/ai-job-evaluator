import { cn } from '@/lib/utils/cn'

interface SkeletonProps {
  /** Sizing lives with the caller — a skeleton must match the real row it stands in for. */
  className?: string
}

/**
 * Loading placeholder. `design-system.md` §12: shapes match final dimensions so real
 * content arriving causes no layout shift, which is also what keeps Phase 4's
 * screenshot diffs quiet.
 *
 * `aria-hidden` because a skeleton has nothing to announce — the panel's own loading
 * state is what a screen reader should hear.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={cn('bg-surface-2 animate-pulse rounded-xl', className)} />
  )
}
