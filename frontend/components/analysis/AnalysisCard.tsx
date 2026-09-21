'use client'

import { useId, useMemo } from 'react'
import { AnalysisHeader } from '@/components/analysis/AnalysisHeader'
import { CriteriaGroup } from '@/components/analysis/CriteriaGroup'
import { MatchScoreRing } from '@/components/analysis/MatchScoreRing'
import { MemoryCitationList } from '@/components/analysis/MemoryCitationList'
import { RationaleNote } from '@/components/analysis/RationaleNote'
import { cn } from '@/lib/utils/cn'
import type { JobAnalysis } from '@/lib/schemas'

/** The only place a 3px border is used in the system — `design-system.md` §5. */
const VERDICT_EDGE = {
  'strong-match': 'border-l-match',
  'partial-match': 'border-l-partial',
  'not-recommended': 'border-l-mismatch',
} as const satisfies Record<JobAnalysis['verdict'], string>

const VERDICT_LABEL = {
  'strong-match': 'Strong match',
  'partial-match': 'Partial match',
  'not-recommended': 'Not recommended',
} as const satisfies Record<JobAnalysis['verdict'], string>

const VERDICT_TEXT = {
  'strong-match': 'text-match',
  'partial-match': 'text-partial',
  'not-recommended': 'text-mismatch',
} as const satisfies Record<JobAnalysis['verdict'], string>

interface AnalysisCardProps {
  analysis: JobAnalysis
  className?: string
}

/**
 * **This must not read as a chat bubble** — that is an acceptance criterion (AB-03),
 * not a style preference. The differentiators, each deliberate:
 *
 *  - `w-full`: it breaks the 72ch bubble rail, so a `get box` comparison shows it
 *    measurably wider than the adjacent `MessageBubble`.
 *  - `rounded-xl` + a 3px verdict-coloured left edge vs. the bubble's borderless
 *    `rounded-2xl`.
 *  - `surface-1` + border (elevation level 1) vs. the bubble's `surface-2`.
 *  - Mono eyebrow + mono numerals mixed with sans body, vs. sans only.
 *  - Five structural regions vs. one text block.
 *
 * Built against `m_pe_002` — 15 criteria, a 251-character label, two criteria with no
 * `detail`. `min-w-0` on every nested flex/grid child is what stops that label from
 * forcing a horizontal scrollbar.
 */
export function AnalysisCard({ analysis, className }: AnalysisCardProps) {
  const titleId = useId()

  const { matched, mismatched } = useMemo(() => {
    // `partial` lives in the matched column, tagged — it is a qualified yes, not a no.
    return {
      matched: analysis.criteria.filter((c) => c.status !== 'mismatch'),
      mismatched: analysis.criteria.filter((c) => c.status === 'mismatch'),
    }
  }, [analysis.criteria])

  return (
    <article
      role="article"
      aria-labelledby={titleId}
      data-testid="analysis-card"
      className={cn(
        'border-border flex w-full min-w-0 flex-col gap-4 rounded-xl border border-l-[3px]',
        'bg-surface-1 p-4',
        VERDICT_EDGE[analysis.verdict],
        className,
      )}
    >
      <span className="text-eyebrow text-muted font-mono tracking-[0.08em] uppercase">
        Job match analysis
      </span>

      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <AnalysisHeader analysis={analysis} titleId={titleId} />
        <div className="flex shrink-0 flex-col items-center gap-1">
          <MatchScoreRing score={analysis.matchScore} verdict={analysis.verdict} />
          <span
            className={cn(
              'text-eyebrow font-mono tracking-[0.08em] uppercase',
              VERDICT_TEXT[analysis.verdict],
            )}
          >
            {VERDICT_LABEL[analysis.verdict]}
          </span>
        </div>
      </div>

      <div className="border-border grid min-w-0 gap-6 border-t pt-4 md:grid-cols-2">
        <CriteriaGroup label="Matched" criteria={matched} />
        <CriteriaGroup label="Mismatched" criteria={mismatched} />
      </div>

      <RationaleNote rationale={analysis.rationale} />
      <MemoryCitationList citations={analysis.memoryCitations} />
    </article>
  )
}
