'use client'

import { useState } from 'react'
import { CircleAlert, Pin, PinOff, Trash } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { useFactActions } from '@/hooks/useFactActions'
import { ApiError } from '@/lib/api/fetcher'
import { keys } from '@/lib/api/keys'
import { cn } from '@/lib/utils/cn'
import type { MemoryFact } from '@/lib/schemas'

const ACTION_STYLES = cn(
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border',
  'bg-surface-1 text-muted transition-colors duration-fast hover:text-accent',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

interface MemoryFactActionsProps {
  fact: MemoryFact
  /** Called as soon as a delete starts. The card unmounts optimistically, so the panel moves focus. */
  onDeleted: () => void
  /** A failed delete is reported to the panel. This component has already unmounted. */
  onDeleteError: (message: string) => void
  className?: string
}

/**
 * Pin and delete for one fact. Both are optimistic with rollback (`useFactActions`).
 *
 * The accessible names carry the fact label, which is stable for a fact, so they do
 * not change on toggle. The pin state is carried by `aria-pressed` and by the icon.
 *
 * After any failure, `/api/memory` is revalidated. A rollback after a 404 would
 * otherwise resurrect a fact the server has already deleted.
 *
 * Delete is immediate, with no confirmation step (an open product question). It is
 * recoverable only via `POST /api/dev/reset`.
 */
export function MemoryFactActions({
  fact,
  onDeleted,
  onDeleteError,
  className,
}: MemoryFactActionsProps) {
  const { togglePin, remove } = useFactActions()
  const { mutate } = useSWRConfig()
  const [pending, setPending] = useState<'pin' | null>(null)
  const [pinError, setPinError] = useState<string | null>(null)

  async function handlePin() {
    setPending('pin')
    setPinError(null)
    try {
      await togglePin(fact)
    } catch (e) {
      setPinError(factErrorMessage(e))
      void mutate(keys.memory())
    } finally {
      setPending(null)
    }
  }

  async function handleDelete() {
    const request = remove(fact.id)
    onDeleted()
    try {
      await request
    } catch (e) {
      onDeleteError(factErrorMessage(e))
      void mutate(keys.memory())
    }
  }

  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handlePin()}
          disabled={pending !== null}
          aria-pressed={fact.pinned}
          aria-label={`Pin fact: ${fact.label}`}
          className={ACTION_STYLES}
        >
          {fact.pinned ? (
            <PinOff size={20} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Pin size={20} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={pending !== null}
          aria-label={`Delete fact: ${fact.label}`}
          className={ACTION_STYLES}
        >
          <Trash size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {pinError ? (
        <p role="alert" className="text-caption text-mismatch flex items-center gap-1">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          {pinError}
        </p>
      ) : null}
    </div>
  )
}

function factErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === 'FACT_NOT_FOUND') {
    return 'This fact was already removed.'
  }
  return 'Could not update this fact — try again.'
}
