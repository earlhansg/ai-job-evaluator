import { CriterionRow } from '@/components/analysis/CriterionRow'
import { cn } from '@/lib/utils/cn'
import { formatCount } from '@/lib/utils/format'
import type { CriterionResult } from '@/lib/schemas'

interface CriteriaGroupProps {
  /** `Matched` or `Mismatched` — the column heading. */
  label: string
  criteria: CriterionResult[]
  className?: string
}

/** One column of the two-column criteria layout. Renders nothing when empty. */
export function CriteriaGroup({ label, criteria, className }: CriteriaGroupProps) {
  if (criteria.length === 0) return null

  return (
    <section className={cn('flex min-w-0 flex-col gap-3', className)}>
      <h4 className="text-eyebrow text-muted flex items-baseline gap-2 font-mono tracking-[0.08em] uppercase">
        {label}
        <span className="tabular-nums">{formatCount(criteria.length)}</span>
      </h4>
      <ul className="flex min-w-0 flex-col gap-3">
        {criteria.map((criterion) => (
          <CriterionRow key={criterion.id} criterion={criterion} />
        ))}
      </ul>
    </section>
  )
}
