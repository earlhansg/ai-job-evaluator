/**
 * THE SEAM.
 *
 * `ChatStore` is the port; `mock-store.ts` and `redis-store.ts` are the adapters,
 * selected at runtime by `AJE_STORE`. Two properties look like overhead and are not:
 *
 *   - **Every method returns a `Promise`**, even though the mock resolves
 *     synchronously. Adding real I/O later then changes zero call sites.
 *   - **Every method takes `userId` first**, even though it is always `'u_demo'`.
 *     Adding auth later changes how that value is resolved, not ten signatures.
 *
 * Do not "simplify" either away — `.claude/reference/api.md` §11 lists both as
 * explicit anti-patterns.
 *
 * Stores return `null` for a missing resource. They never throw for absence and never
 * construct HTTP responses; the handler translates `null` into a 404.
 */
import type {
  ChatMessage,
  ChatSession,
  ChatSessionSummary,
  ContextSummary,
  MemoryFact,
} from '@/lib/schemas'

export interface ChatStore {
  listSessions(userId: string): Promise<ChatSessionSummary[]>
  getSession(userId: string, sessionId: string): Promise<ChatSession | null>
  getMessages(userId: string, sessionId: string): Promise<ChatMessage[]>
  appendMessage(userId: string, sessionId: string, m: ChatMessage): Promise<void>
  getSummaries(userId: string, sessionId: string): Promise<ContextSummary[]>
  putSummary(userId: string, sessionId: string, s: ContextSummary): Promise<void>
  listFacts(userId: string): Promise<MemoryFact[]>
  upsertFact(userId: string, f: MemoryFact): Promise<MemoryFact>
  deleteFact(userId: string, factId: string): Promise<void>
  reset(userId: string): Promise<void>
}

export type StoreKind = 'mock' | 'redis'
