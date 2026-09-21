/**
 * In-memory `ChatStore`, seeded from `lib/mock/fixtures/`.
 *
 * Its `Map`s are keyed with the **exact strings Redis will use** (PRD-ONE §6.4), so
 * porting is mechanical — `map.get(k)` becomes `redis.hgetall(k)` and nothing above
 * the seam changes.
 *
 * Never import this module directly. Always go through `getStore()`.
 */
import { LATENCY_MS } from '@/lib/config'
import {
  ChatMessage,
  ChatSession,
  ContextSummary,
  MemoryFact,
  type ChatSessionSummary,
} from '@/lib/schemas'
import type { ChatStore } from '@/lib/store/types'
import sessionsFixture from '@/lib/mock/fixtures/sessions.json'
import messagesFixture from '@/lib/mock/fixtures/messages.json'
import factsFixture from '@/lib/mock/fixtures/facts.json'
import summariesFixture from '@/lib/mock/fixtures/summaries.json'

// ---------------------------------------------------------------------------
// Redis key strings — the whole point of this file
// ---------------------------------------------------------------------------

/** Sorted set, score = `updatedAt`. */
const sessionIndexKey = (userId: string) => `user:${userId}:sessions`
/** Hash. */
const sessionMetaKey = (sessionId: string) => `session:${sessionId}:meta`
/** List of JSON strings. */
const messagesKey = (sessionId: string) => `session:${sessionId}:messages`
/** List of JSON strings. */
const summariesKey = (sessionId: string) => `session:${sessionId}:summaries`
/** Hash, field = `factId`. */
const memoryKey = (userId: string) => `user:${userId}:memory`

type Tables = {
  /** `user:{userId}:sessions` → sessionId → score (updatedAt as epoch ms) */
  sessionIndex: Map<string, Map<string, number>>
  /** `session:{sessionId}:meta` → session */
  sessionMeta: Map<string, ChatSession>
  /** `session:{sessionId}:messages` → messages, oldest→newest */
  messages: Map<string, ChatMessage[]>
  /** `session:{sessionId}:summaries` → summaries */
  summaries: Map<string, ContextSummary[]>
  /** `user:{userId}:memory` → factId → fact */
  memory: Map<string, Map<string, MemoryFact>>
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

/**
 * Deep-clones every fixture before it enters a table.
 *
 * Seeding by reference would let the first mutation write *through* into the imported
 * JSON module object, which is cached for the process lifetime — so `POST /api/dev/reset`
 * would restore the already-mutated data and the E2E suite would stop being repeatable.
 * That would defeat the entire purpose of the reset endpoint.
 *
 * Fixtures are validated through their zod schemas here and fail loudly. Hand-authored
 * `tokenEstimate` values are exactly the kind of thing that rots silently.
 */
function seed(): Tables {
  const sessions = parseFixture(
    'sessions.json',
    ChatSession.array(),
    structuredClone(sessionsFixture),
  )
  const messagesBySession = parseFixture(
    'messages.json',
    ChatMessage.array(),
    structuredClone(messagesFixture),
    { perKey: true },
  )
  const facts = parseFixture('facts.json', MemoryFact.array(), structuredClone(factsFixture))
  const seededSummaries = structuredClone(summariesFixture.seeded) as Record<string, unknown[]>

  const tables: Tables = {
    sessionIndex: new Map(),
    sessionMeta: new Map(),
    messages: new Map(),
    summaries: new Map(),
    memory: new Map(),
  }

  for (const session of sessions) {
    const index =
      tables.sessionIndex.get(sessionIndexKey(session.userId)) ?? new Map<string, number>()
    index.set(session.id, Date.parse(session.updatedAt))
    tables.sessionIndex.set(sessionIndexKey(session.userId), index)

    tables.sessionMeta.set(sessionMetaKey(session.id), session)
    tables.messages.set(messagesKey(session.id), messagesBySession[session.id] ?? [])
    tables.summaries.set(
      summariesKey(session.id),
      parseFixture('summaries.json', ContextSummary.array(), seededSummaries[session.id] ?? []),
    )
  }

  for (const fact of facts) {
    const bucket = tables.memory.get(memoryKey(fact.userId)) ?? new Map<string, MemoryFact>()
    bucket.set(fact.id, fact)
    tables.memory.set(memoryKey(fact.userId), bucket)
  }

  return tables
}

type ParseTarget<T> = {
  safeParse: (value: unknown) => { success: boolean; data?: T; error?: unknown }
}

function parseFixture<T>(file: string, schema: ParseTarget<T>, value: unknown): T
function parseFixture<T>(
  file: string,
  schema: ParseTarget<T>,
  value: unknown,
  opts: { perKey: true },
): Record<string, T>
function parseFixture<T>(
  file: string,
  schema: ParseTarget<T>,
  value: unknown,
  opts?: { perKey: true },
): T | Record<string, T> {
  if (opts?.perKey) {
    const record = value as Record<string, unknown>
    const out: Record<string, T> = {}
    for (const [key, entry] of Object.entries(record)) {
      out[key] = parseFixture(`${file} → ${key}`, schema, entry)
    }
    return out
  }

  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new Error(
      `Fixture ${file} failed schema validation: ${JSON.stringify(parsed.error, null, 2)}`,
    )
  }
  return parsed.data as T
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/** Simulated store latency. Applied here and nowhere else — nothing above the seam knows it exists. */
function delay(): Promise<void> {
  if (!LATENCY_MS) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
}

function toSummary(session: ChatSession): ChatSessionSummary {
  const { userId: _userId, ...summary } = session
  return summary
}

class MockChatStore implements ChatStore {
  private tables: Tables = seed()

  async listSessions(userId: string): Promise<ChatSessionSummary[]> {
    await delay()
    const index = this.tables.sessionIndex.get(sessionIndexKey(userId))
    if (!index) return []

    // Sorted set semantics: ordered by score (updatedAt), highest first.
    return [...index.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([sessionId]) => this.tables.sessionMeta.get(sessionMetaKey(sessionId)))
      .filter((session): session is ChatSession => session !== undefined)
      .map(toSummary)
  }

  async getSession(userId: string, sessionId: string): Promise<ChatSession | null> {
    await delay()
    const session = this.tables.sessionMeta.get(sessionMetaKey(sessionId))
    if (!session || session.userId !== userId) return null
    return session
  }

  async getMessages(userId: string, sessionId: string): Promise<ChatMessage[]> {
    await delay()
    if (!this.ownsSession(userId, sessionId)) return []
    return this.tables.messages.get(messagesKey(sessionId)) ?? []
  }

  async appendMessage(userId: string, sessionId: string, m: ChatMessage): Promise<void> {
    await delay()
    const session = this.tables.sessionMeta.get(sessionMetaKey(sessionId))
    if (!session || session.userId !== userId) return

    const messages = this.tables.messages.get(messagesKey(sessionId)) ?? []
    messages.push(m)
    this.tables.messages.set(messagesKey(sessionId), messages)

    const updated: ChatSession = {
      ...session,
      messageCount: messages.length,
      evaluationCount: messages.filter((msg) => msg.kind === 'analysis').length,
      tokensUsed: messages.reduce((total, msg) => total + msg.tokenEstimate, 0),
      preview: m.content.slice(0, 120),
      updatedAt: m.createdAt,
    }
    this.tables.sessionMeta.set(sessionMetaKey(sessionId), updated)
    this.tables.sessionIndex.get(sessionIndexKey(userId))?.set(sessionId, Date.parse(m.createdAt))
  }

  async getSummaries(userId: string, sessionId: string): Promise<ContextSummary[]> {
    await delay()
    if (!this.ownsSession(userId, sessionId)) return []
    return this.tables.summaries.get(summariesKey(sessionId)) ?? []
  }

  async putSummary(userId: string, sessionId: string, s: ContextSummary): Promise<void> {
    await delay()
    if (!this.ownsSession(userId, sessionId)) return

    const summaries = this.tables.summaries.get(summariesKey(sessionId)) ?? []
    const existing = summaries.findIndex((summary) => summary.id === s.id)
    if (existing >= 0) summaries[existing] = s
    else summaries.push(s)
    this.tables.summaries.set(summariesKey(sessionId), summaries)
  }

  async listFacts(userId: string): Promise<MemoryFact[]> {
    await delay()
    return [...(this.tables.memory.get(memoryKey(userId))?.values() ?? [])]
  }

  async upsertFact(userId: string, f: MemoryFact): Promise<MemoryFact> {
    await delay()
    const bucket = this.tables.memory.get(memoryKey(userId)) ?? new Map<string, MemoryFact>()
    const existing = bucket.get(f.id)

    // An existing fact keeps its original creation time; everything else is overwritten
    // by the caller. `hitCount` is deliberately *not* bumped here — a pin toggle must
    // not inflate "cited in N evaluations". The scripted-reply path does that bump.
    const next: MemoryFact = existing ? { ...existing, ...f, createdAt: existing.createdAt } : f

    bucket.set(next.id, next)
    this.tables.memory.set(memoryKey(userId), bucket)
    return next
  }

  async deleteFact(userId: string, factId: string): Promise<void> {
    await delay()
    this.tables.memory.get(memoryKey(userId))?.delete(factId)
  }

  async reset(_userId: string): Promise<void> {
    await delay()
    // Reseeds every user's data. Single-tenant today; when auth lands this narrows to
    // the caller's namespace.
    this.tables = seed()
  }

  private ownsSession(userId: string, sessionId: string): boolean {
    return this.tables.sessionMeta.get(sessionMetaKey(sessionId))?.userId === userId
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/**
 * `globalThis`-guarded so HMR doesn't wipe state mid-review (PRD-ONE §14 R2).
 * A full dev-server restart still resets it — that is expected, and is what Redis fixes.
 */
const globalForStore = globalThis as unknown as {
  __ajeMockStore?: MockChatStore
}

export const mockStore: ChatStore = (globalForStore.__ajeMockStore ??= new MockChatStore())
