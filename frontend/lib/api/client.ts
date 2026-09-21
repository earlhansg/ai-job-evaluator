/**
 * Typed read wrappers over `fetcher`.
 *
 * These add almost nothing today — deliberately. The file exists so Phase 3's mutations
 * (`sendMessage`, `patchFact`, `deleteFact`) have an established home next to the reads
 * rather than being invented ad hoc inside a hook. Read-only for now.
 */
import { fetcher } from '@/lib/api/fetcher'
import { keys } from '@/lib/api/keys'
import type { MemoryResponse, SessionResponse, SessionsResponse } from '@/lib/schemas'

export function getSessions(): Promise<SessionsResponse> {
  return fetcher<SessionsResponse>(keys.sessions())
}

export function getSession(sessionId: string): Promise<SessionResponse> {
  return fetcher<SessionResponse>(keys.session(sessionId))
}

export function getMemory(): Promise<MemoryResponse> {
  return fetcher<MemoryResponse>(keys.memory())
}
