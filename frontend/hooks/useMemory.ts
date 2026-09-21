/**
 * Panel 3's data source — the long-term memory facts and their per-category counts.
 */
import useSWR from 'swr'
import { keys } from '@/lib/api/keys'
import type { ApiError } from '@/lib/api/fetcher'
import type { MemoryResponse } from '@/lib/schemas'

export function useMemory() {
  return useSWR<MemoryResponse, ApiError>(keys.memory())
}
