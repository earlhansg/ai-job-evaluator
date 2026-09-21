import { WorkModeBadge } from '@/components/analysis/WorkModeBadge'
import { cn } from '@/lib/utils/cn'
import type { JobAnalysis } from '@/lib/schemas'

interface AnalysisHeaderProps {
  analysis: JobAnalysis
  /** Wired to the card's `aria-labelledby`, so the card's name carries the job title. */
  titleId: string
  className?: string
}

/** Job title, company, work mode, location, and compensation when the source has it. */
export function AnalysisHeader({ analysis, titleId, className }: AnalysisHeaderProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <h3 id={titleId} className="text-title text-text font-medium break-words">
        {analysis.jobTitle}
      </h3>

      <p className="text-body text-muted break-words">
        {analysis.company} · {analysis.location}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <WorkModeBadge workMode={analysis.workMode} />
        {/* Absent on three of the four seeded analyses — render nothing, not an empty slot. */}
        {analysis.compensation ? (
          <span className="text-caption text-text font-mono tabular-nums">
            {analysis.compensation}
          </span>
        ) : null}
      </div>
    </div>
  )
}
