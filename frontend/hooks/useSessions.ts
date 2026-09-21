/**
 * Panel 1's data source. The key comes from `lib/api/keys.ts`; the fetcher comes from
 * `SWRConfig` in `app/providers.tsx`.
 *
 * The whole SWR result is returned — components need `mutate` for the retry button.
 */
import useSWR from 'swr'
import { keys } from '@/lib/api/keys'
import type { ApiError } from '@/lib/api/fetcher'
import type { SessionsResponse } from '@/lib/schemas'

export function useSessions() {
  return useSWR<SessionsResponse, ApiError>(keys.sessions())
}
