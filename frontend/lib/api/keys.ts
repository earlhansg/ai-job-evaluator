/**
 * Every endpoint path, in one place.
 *
 * Architecture invariant: **no endpoint string literal appears outside this file.**
 * Components and hooks use `keys.session(id)`, never `` `/api/sessions/${id}` ``.
 * These double as SWR cache keys, which is why they are plain strings.
 *
 * Pulled forward from Phase 2 because `api.md` §9's per-endpoint checklist requires a
 * key alongside each new endpoint, and this module has no dependencies. `fetcher.ts`
 * and `client.ts` stay in Phase 2 — they are client-side and have no consumer yet.
 */
export const keys = {
  sessions: () => '/api/sessions',
  session: (sessionId: string) => `/api/sessions/${sessionId}`,
  messages: (sessionId: string) => `/api/sessions/${sessionId}/messages`,
  memory: () => '/api/memory',
  fact: (factId: string) => `/api/memory/${factId}`,
  devReset: () => '/api/dev/reset',
} as const
