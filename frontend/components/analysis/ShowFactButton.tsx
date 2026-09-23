'use client'

import { Tooltip } from '@/components/ui/Tooltip'
import { useMemory } from '@/hooks/useMemory'
import { useMemoryActivity } from '@/hooks/useMemoryActivity'
import { cn } from '@/lib/utils/cn'

interface ShowFactButtonProps {
  factId: string
  /** Stable name. Say what is shown, e.g. `Show saved fact: Avoids onsite roles`. */
  accessibleName: string
  children: React.ReactNode
  className?: string
}

/**
 * "Show this fact in memory": scrolls Panel 3 to the fact and flashes it, opening the
 * memory drawer first below 1280px. Shared by criterion rows and citation chips; the
 * caller supplies the visual (an icon or a whole chip) as `children`.
 *
 * An analysis can outlive the fact it cites (the user deleted it). The button then
 * becomes `aria-disabled` with a tooltip saying why. `aria-disabled` rather than
 * `disabled` keeps it reachable by keyboard so the explanation can be read, the same
 * pattern as `NewSessionButton`. While memory is still loading the fact is assumed to
 * exist, so there is no flash of a disabled state. `useMemory()` is deduplicated by
 * SWR, so N buttons make one request.
 */
export function ShowFactButton({
  factId,
  accessibleName,
  children,
  className,
}: ShowFactButtonProps) {
  const { showFact } = useMemoryActivity()
  const { data } = useMemory()
  const exists = !data || data.facts.some((fact) => fact.id === factId)

  if (!exists) {
    return (
      <Tooltip content="This fact is no longer in memory.">
        <button
          type="button"
          aria-disabled="true"
          aria-label={accessibleName}
          className={cn('cursor-not-allowed opacity-50', className)}
        >
          {children}
        </button>
      </Tooltip>
    )
  }

  return (
    <button
      type="button"
      onClick={() => showFact(factId)}
      aria-label={accessibleName}
      className={cn('duration-fast hover:text-accent rounded-md transition-colors', className)}
    >
      {children}
    </button>
  )
}
