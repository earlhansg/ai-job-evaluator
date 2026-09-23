'use client'

import { useMemo, useRef, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { PanelShell } from '@/components/layout/PanelShell'
import { PanelError } from '@/components/ui/PanelError'
import { MemoryCategoryGroup } from '@/components/memory/MemoryCategoryGroup'
import { MemoryEmptyState } from '@/components/memory/MemoryEmptyState'
import { MemoryPanelSkeleton } from '@/components/memory/MemoryPanelSkeleton'
import { MemoryStatsHeader } from '@/components/memory/MemoryStatsHeader'
import { useMemory } from '@/hooks/useMemory'
import { cn } from '@/lib/utils/cn'
import type { MemoryCategory, MemoryFact } from '@/lib/schemas'

/**
 * Fixed display order and labels.
 *
 * `satisfies` couples this to the zod enum at compile time **without importing the zod
 * value** — schemas are server-only, and importing `MemoryCategory.options` here would
 * pull zod into the browser bundle. Adding a seventh category becomes a type error.
 */
const CATEGORY_LABELS = {
  dealbreaker: 'Dealbreakers',
  role: 'Role',
  compensation: 'Compensation',
  location: 'Location',
  skill: 'Skills',
  preference: 'Preferences',
} as const satisfies Record<MemoryCategory, string>

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as MemoryCategory[]

interface LongTermMemoryPanelProps {
  className?: string
}

/**
 * Panel 3. `complementary` landmark, four render states.
 *
 * `listFacts` returns Map insertion order — i.e. fixture order — not a sort. The
 * deterministic order is imposed here (fixed category order, then `hitCount` desc,
 * then id) so the panel does not reshuffle after Phase 3's writes.
 *
 * Delete focus management lives here: the deleted card unmounts optimistically, so
 * focus moves to the stats block (next to the count that just dropped). A failed delete
 * is reported here too, because the card that started it is already gone.
 */
export function LongTermMemoryPanel({ className }: LongTermMemoryPanelProps) {
  const { data, error, isLoading, mutate } = useMemory()
  const statsRef = useRef<HTMLDivElement>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const facts = data?.facts
  const grouped = useMemo(() => groupByCategory(facts ?? []), [facts])

  function onFactDeleted() {
    setDeleteError(null)
    requestAnimationFrame(() => statsRef.current?.focus())
  }

  return (
    <PanelShell
      landmark="complementary"
      aria-label="Long-term memory"
      title="Long-term memory"
      className={cn('border-border', className)}
    >
      {error ? (
        <PanelError message={panelErrorMessage(error.code)} onRetry={() => void mutate()} />
      ) : isLoading || !data || !facts ? (
        <MemoryPanelSkeleton />
      ) : facts.length === 0 ? (
        <MemoryEmptyState />
      ) : (
        <div className="flex flex-col gap-6">
          <MemoryStatsHeader
            ref={statsRef}
            factCount={facts.length}
            categoryCount={CATEGORY_ORDER.filter((c) => grouped[c].length > 0).length}
            updatedAt={data.updatedAt}
          />
          {deleteError ? (
            <p role="alert" className="text-caption text-mismatch flex items-center gap-1">
              <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
              {deleteError}
            </p>
          ) : null}
          <div className="flex flex-col gap-6">
            {CATEGORY_ORDER.filter((category) => grouped[category].length > 0).map((category) => (
              <MemoryCategoryGroup
                key={category}
                label={CATEGORY_LABELS[category]}
                facts={grouped[category]}
                onFactDeleted={onFactDeleted}
                onDeleteError={setDeleteError}
              />
            ))}
          </div>
        </div>
      )}
    </PanelShell>
  )
}

function groupByCategory(facts: MemoryFact[]): Record<MemoryCategory, MemoryFact[]> {
  const grouped = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, [] as MemoryFact[]])) as Record<
    MemoryCategory,
    MemoryFact[]
  >

  for (const fact of facts) grouped[fact.category].push(fact)
  for (const category of CATEGORY_ORDER) {
    grouped[category].sort((a, b) => b.hitCount - a.hitCount || a.id.localeCompare(b.id))
  }
  return grouped
}

function panelErrorMessage(code: string): string {
  return code === 'INTERNAL_ERROR'
    ? 'Long-term memory is unavailable right now.'
    : 'Could not load your remembered facts.'
}
