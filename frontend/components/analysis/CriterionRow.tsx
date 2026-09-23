'use client'

import { Brain, CircleCheck, CircleMinus, CircleX } from 'lucide-react'
import { ShowFactButton } from '@/components/analysis/ShowFactButton'
import { cn } from '@/lib/utils/cn'
import type { CriterionResult } from '@/lib/schemas'

/** Fixed per meaning, never substituted — `design-system.md` §9. */
const STATUS_ICON = {
  match: CircleCheck,
  mismatch: CircleX,
  partial: CircleMinus,
} as const satisfies Record<CriterionResult['status'], typeof CircleCheck>

const STATUS_COLOR = {
  match: 'text-match',
  mismatch: 'text-mismatch',
  partial: 'text-partial',
} as const satisfies Record<CriterionResult['status'], string>

const STATUS_LABEL = {
  match: 'Match',
  mismatch: 'Mismatch',
  partial: 'Partial',
} as const satisfies Record<CriterionResult['status'], string>

interface CriterionRowProps {
  criterion: CriterionResult
  className?: string
}

/**
 * One ✓ / ✗ / ≈ line.
 *
 * Status is carried three ways, never by colour alone (WCAG 1.4.1): a distinct icon
 * shape, a text label in the accessibility tree, and — for `partial`, which sits in
 * the *matched* column and would otherwise be ambiguous — a visible tag.
 *
 * `min-w-0` plus `break-words` is what keeps the 251-character label in `m_pe_002`
 * inside the grid instead of blowing the column out.
 *
 * A criterion driven by a stored preference (`sourceFactId`) ends its label line with a
 * brain icon that shows that fact in Panel 3. Only the icon is interactive: the row
 * text stays plain, so the status semantics above are unchanged. The icon is 24px, so
 * an `after:` overlay extends its hit area without moving the layout.
 */
export function CriterionRow({ criterion, className }: CriterionRowProps) {
  const Icon = STATUS_ICON[criterion.status]

  return (
    <li className={cn('flex min-w-0 items-start gap-2', className)}>
      <Icon
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        className={cn('mt-1 shrink-0', STATUS_COLOR[criterion.status])}
      />

      <div className="flex min-w-0 flex-col gap-1">
        {/* `relative` is load-bearing, not cosmetic. Tailwind's `sr-only` is
            `position: absolute`, and with no positioned ancestor it resolves against the
            initial containing block — escaping the panel's `overflow-y-auto` and
            stretching the *document* to the full un-scrolled height of the transcript.
            That makes the whole page scrollable behind a layout that must not scroll. */}
        <span className="relative flex flex-wrap items-baseline gap-2">
          <span className="sr-only">{STATUS_LABEL[criterion.status]}: </span>
          <span className="text-body text-text min-w-0 break-words">{criterion.label}</span>

          {criterion.status === 'partial' ? (
            <span className="text-eyebrow text-partial font-mono tracking-[0.08em] uppercase">
              Partial
            </span>
          ) : null}

          {criterion.weight === 'must-have' ? (
            <span className="text-eyebrow text-muted font-mono tracking-[0.08em] uppercase">
              Must have
            </span>
          ) : null}

          {criterion.sourceFactId ? (
            <ShowFactButton
              factId={criterion.sourceFactId}
              accessibleName={`Show the saved fact behind: ${criterion.label}`}
              className={cn(
                'text-muted relative inline-flex size-6 shrink-0 items-center justify-center self-center',
                "after:absolute after:-inset-2 after:content-['']",
              )}
            >
              <Brain size={16} strokeWidth={1.75} aria-hidden="true" />
            </ShowFactButton>
          ) : null}
        </span>

        {/* Two criteria in `m_pe_002` have no detail — render nothing, not an empty line. */}
        {criterion.detail ? (
          <span className="text-caption text-muted break-words">{criterion.detail}</span>
        ) : null}
      </div>
    </li>
  )
}
