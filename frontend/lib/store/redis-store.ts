/**
 * Redis adapter — stub.
 *
 * Kept in lockstep with `ChatStore` so the migration is mechanical: adding a store
 * method means adding a stub here in the same commit (`api.md` §9 step 2). The
 * compiler enforces it — this object is typed as `ChatStore`, so a missing method
 * fails `tsc`, not a runtime call in six weeks.
 *
 * Implementation notes for that phase (PRD-ONE §6.4 key map):
 *   user:{userId}:sessions      sorted set, score = updatedAt
 *   session:{sessionId}:meta    hash
 *   session:{sessionId}:messages   list of JSON strings
 *   session:{sessionId}:summaries  list of JSON strings
 *   user:{userId}:memory        hash, field = factId
 * Everything read back from Redis is `unknown` — parse it through the zod schema in
 * `lib/schemas.ts` before returning it.
 */
import type { ChatStore } from '@/lib/store/types'

function notImplemented(method: string): never {
  throw new Error(
    `NOT_IMPLEMENTED: ChatStore.${method} has no Redis implementation yet. ` +
      'Set AJE_STORE=mock, or implement lib/store/redis-store.ts.',
  )
}

export const redisStore: ChatStore = {
  listSessions: () => notImplemented('listSessions'),
  getSession: () => notImplemented('getSession'),
  getMessages: () => notImplemented('getMessages'),
  appendMessage: () => notImplemented('appendMessage'),
  getSummaries: () => notImplemented('getSummaries'),
  putSummary: () => notImplemented('putSummary'),
  listFacts: () => notImplemented('listFacts'),
  upsertFact: () => notImplemented('upsertFact'),
  deleteFact: () => notImplemented('deleteFact'),
  reset: () => notImplemented('reset'),
}
