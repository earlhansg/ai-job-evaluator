/**
 * Panel 2's data source — session metadata, messages and the computed session-memory
 * state for one session.
 */
import useSWR from 'swr'
import { keys } from '@/lib/api/keys'
import type { ApiError } from '@/lib/api/fetcher'
import type { SessionResponse } from '@/lib/schemas'

export function useSession(sessionId: string) {
  return useSWR<SessionResponse, ApiError>(keys.session(sessionId))
}
