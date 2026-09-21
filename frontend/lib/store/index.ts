/**
 * The store factory — the switch that makes the Redis migration a config change.
 *
 * Always `getStore()`. Never import `mock-store` or `redis-store` directly.
 */
import { mockStore } from '@/lib/store/mock-store'
import { redisStore } from '@/lib/store/redis-store'
import type { ChatStore, StoreKind } from '@/lib/store/types'

/**
 * Reads `AJE_STORE`. An unrecognised value **throws** rather than falling back to the
 * mock: a silent fallback would make `x-data-source` lie, and that header is the only
 * external proof the seam exists (E2E check AB-06).
 */
export function getStoreKind(): StoreKind {
  const configured = process.env.AJE_STORE ?? 'mock'
  if (configured !== 'mock' && configured !== 'redis') {
    throw new Error(
      `AJE_STORE must be "mock" or "redis"; received "${configured}". ` +
        'Refusing to fall back silently — x-data-source would then report a store that is not in use.',
    )
  }
  return configured
}

export function getStore(): ChatStore {
  return getStoreKind() === 'redis' ? redisStore : mockStore
}
