'use client'

import { SquarePen } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils/cn'

interface NewSessionButtonProps {
  className?: string
}

/**
 * Present and labelled, but inert.
 *
 * A new session cannot survive a process restart until the Redis store lands, so the
 * button is inert and the tooltip says why rather than creating a draft that silently
 * disappears. The client-only draft behaviour is Phase 3.
 *
 * `aria-disabled` rather than the `disabled` attribute: a truly disabled button is
 * removed from the tab order, which would make the tooltip explaining *why* it is
 * disabled unreachable by keyboard. It carries no handler, so it does nothing.
 */
export function NewSessionButton({ className }: NewSessionButtonProps) {
  return (
    <Tooltip side="bottom" content="New sessions persist once the Redis store lands.">
      <button
        type="button"
        aria-disabled="true"
        aria-label="New session"
        className={cn(
          'inline-flex size-8 cursor-not-allowed items-center justify-center rounded-md',
          'border-border bg-surface-1 text-muted border opacity-50',
          className,
        )}
      >
        <SquarePen size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </Tooltip>
  )
}
