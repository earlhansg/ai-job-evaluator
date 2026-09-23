'use client'

/**
 * Pin toggle and delete for a Panel 3 fact. Both are optimistic against `/api/memory`
 * and roll back on error; the `ApiError` propagates so the caller can show it inline.
 *
 * The global `mutate` (not a bound one): the card that triggers these is not the
 * component that owns the `useMemory()` subscription.
 */
import { useSWRConfig } from 'swr'
import { deleteFact, patchFact } from '@/lib/api/client'
import { withFactRemoved, withFactReplaced } from '@/lib/api/cache-updates'
import { keys } from '@/lib/api/keys'
import type { DeleteFactResponse, MemoryFact, MemoryResponse } from '@/lib/schemas'

export function useFactActions(): {
  togglePin: (fact: MemoryFact) => Promise<void>
  remove: (factId: string) => Promise<void>
} {
  const { mutate } = useSWRConfig()

  async function togglePin(fact: MemoryFact): Promise<void> {
    const pinned = !fact.pinned
    await mutate<MemoryResponse | undefined, MemoryFact>(
      keys.memory(),
      patchFact(fact.id, pinned),
      {
        optimisticData: (current) => withFactReplaced(current, { ...fact, pinned }),
        populateCache: (updated, current) => withFactReplaced(current, updated),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  async function remove(factId: string): Promise<void> {
    await mutate<MemoryResponse | undefined, DeleteFactResponse>(
      keys.memory(),
      deleteFact(factId),
      {
        optimisticData: (current) => withFactRemoved(current, factId),
        populateCache: (_res, current) => withFactRemoved(current, factId),
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  return { togglePin, remove }
}
