/**
 * Pure SWR cache transforms for the write path.
 *
 * Every piece of data shaping the mutations need lives here, synchronous and unit-tested,
 * so the hooks only wire these to SWR. The SWR plumbing is where the subtle mistakes
 * happen (which key, committed vs. optimistic data); keeping the shaping out of it turns
 * those mistakes into test failures rather than E2E mysteries.
 *
 * Client-safe: `import type` only — no zod, no config.
 */
import type {
  ChatMessage,
  MemoryCategory,
  MemoryFact,
  MemoryResponse,
  SendMessageResponse,
  SessionResponse,
} from '@/lib/schemas'

/** Ids with this prefix exist only in the client cache, never on the server. */
export const OPTIMISTIC_ID_PREFIX = 'm_optimistic_'

/**
 * Every category at zero. `satisfies` couples it to the zod enum without importing the
 * zod value (schemas are server-only).
 */
const CATEGORY_ZERO = {
  role: 0,
  skill: 0,
  preference: 0,
  dealbreaker: 0,
  compensation: 0,
  location: 0,
} as const satisfies Record<MemoryCategory, 0>

const EPOCH = new Date(0).toISOString()

export function buildOptimisticUserMessage(
  sessionId: string,
  content: string,
  createdAt: string,
  seq: number,
): ChatMessage {
  return {
    id: `${OPTIMISTIC_ID_PREFIX}${seq}`,
    sessionId,
    role: 'user',
    kind: 'text',
    content,
    createdAt,
    tokenEstimate: 0,
  }
}

/**
 * Appends the optimistic bubble. `MessageList` renders only ids listed in
 * `sessionMemory.verbatimMessageIds`, so appending to `messages` alone would leave the
 * bubble invisible. Token figures are left alone — the server owns the count.
 */
export function withOptimisticMessage(
  current: SessionResponse | undefined,
  message: ChatMessage,
): SessionResponse | undefined {
  if (!current) return current
  return {
    ...current,
    messages: [...current.messages, message],
    sessionMemory: {
      ...current.sessionMemory,
      verbatimMessageIds: [...current.sessionMemory.verbatimMessageIds, message.id],
    },
  }
}

/**
 * The post-send state, built from the **committed** (pre-optimistic) data SWR hands to
 * `populateCache`. Optimistic ids are filtered out anyway, defensively.
 *
 * Session meta mirrors the mock store's `appendMessage` recompute, so the header and the
 * cached session agree with what a refetch would return.
 */
export function withSendResult(
  committed: SessionResponse | undefined,
  res: SendMessageResponse,
): SessionResponse | undefined {
  if (!committed) return committed

  const messages = [
    ...committed.messages.filter((m) => !m.id.startsWith(OPTIMISTIC_ID_PREFIX)),
    res.userMessage,
    res.assistantMessage,
  ]

  return {
    session: {
      ...committed.session,
      messageCount: messages.length,
      evaluationCount: messages.filter((m) => m.kind === 'analysis').length,
      tokensUsed: messages.reduce((total, m) => total + m.tokenEstimate, 0),
      preview: res.assistantMessage.content.slice(0, 120),
      updatedAt: res.assistantMessage.createdAt,
    },
    messages,
    sessionMemory: res.sessionMemory,
  }
}

/** Mirrors `GET /api/memory`: counts for every category (zeros included), newest `updatedAt`. */
export function memoryFromFacts(facts: MemoryFact[]): MemoryResponse {
  const counts: Record<MemoryCategory, number> = { ...CATEGORY_ZERO }
  for (const fact of facts) counts[fact.category] += 1

  return {
    facts,
    updatedAt: facts.reduce(
      (latest, fact) => (fact.updatedAt > latest ? fact.updatedAt : latest),
      EPOCH,
    ),
    counts,
  }
}

export function withFactReplaced(
  current: MemoryResponse | undefined,
  fact: MemoryFact,
): MemoryResponse | undefined {
  if (!current) return current
  return memoryFromFacts(current.facts.map((f) => (f.id === fact.id ? fact : f)))
}

export function withFactRemoved(
  current: MemoryResponse | undefined,
  factId: string,
): MemoryResponse | undefined {
  if (!current) return current
  return memoryFromFacts(current.facts.filter((f) => f.id !== factId))
}
