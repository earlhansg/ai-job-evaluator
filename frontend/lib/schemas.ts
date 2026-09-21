/**
 * Single source of truth for every data shape in the app.
 *
 * Rules (see `.claude/reference/api.md` §5):
 *  - One definition per shape. Types are derived with `z.infer` — never hand-written.
 *  - Always `safeParse` at a boundary, never `parse` (except dev-only outbound assertions).
 *  - Server-only. Client components import *types* with `import type`, which erases.
 *
 * Zod 4 syntax notes: `error` (not `message`) for the object form of a custom message,
 * `z.record(key, value)` takes both schemas, `z.iso.datetime()` replaces `z.string().datetime()`.
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Primitives / enums
// ---------------------------------------------------------------------------

export const MessageRole = z.enum(['user', 'assistant'])
export type MessageRole = z.infer<typeof MessageRole>

export const MessageKind = z.enum(['text', 'analysis'])
export type MessageKind = z.infer<typeof MessageKind>

export const WorkMode = z.enum(['remote', 'hybrid', 'onsite'])
export type WorkMode = z.infer<typeof WorkMode>

export const Verdict = z.enum(['strong-match', 'partial-match', 'not-recommended'])
export type Verdict = z.infer<typeof Verdict>

export const CriterionWeight = z.enum(['must-have', 'nice-to-have'])
export type CriterionWeight = z.infer<typeof CriterionWeight>

export const CriterionStatus = z.enum(['match', 'mismatch', 'partial'])
export type CriterionStatus = z.infer<typeof CriterionStatus>

export const MemoryCategory = z.enum([
  'role',
  'skill',
  'preference',
  'dealbreaker',
  'compensation',
  'location',
])
export type MemoryCategory = z.infer<typeof MemoryCategory>

export const MemoryAction = z.enum(['created', 'updated', 'reinforced'])
export type MemoryAction = z.infer<typeof MemoryAction>

export const SessionStatus = z.enum(['active', 'archived'])
export type SessionStatus = z.infer<typeof SessionStatus>

export const MemoryStrategy = z.enum(['hybrid-token-buffer'])
export type MemoryStrategy = z.infer<typeof MemoryStrategy>

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export const CriterionResult = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string().optional(),
  weight: CriterionWeight,
  status: CriterionStatus,
  sourceFactId: z.string().optional(),
})
export type CriterionResult = z.infer<typeof CriterionResult>

export const MemoryCitation = z.object({
  factId: z.string(),
  label: z.string(),
  value: z.string(),
})
export type MemoryCitation = z.infer<typeof MemoryCitation>

export const JobAnalysis = z.object({
  jobTitle: z.string(),
  company: z.string(),
  location: z.string(),
  workMode: WorkMode,
  compensation: z.string().optional(),
  matchScore: z.number().int().min(0).max(100),
  verdict: Verdict,
  criteria: z.array(CriterionResult),
  rationale: z.string(),
  memoryCitations: z.array(MemoryCitation),
})
export type JobAnalysis = z.infer<typeof JobAnalysis>

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export const MemoryEffect = z.object({
  factId: z.string(),
  action: MemoryAction,
  label: z.string(),
})
export type MemoryEffect = z.infer<typeof MemoryEffect>

export const MemoryFact = z.object({
  id: z.string(),
  userId: z.string(),
  category: MemoryCategory,
  label: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  pinned: z.boolean(),
  hitCount: z.number().int().min(0),
  source: z.object({ sessionId: z.string(), messageId: z.string() }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type MemoryFact = z.infer<typeof MemoryFact>

// ---------------------------------------------------------------------------
// Messages — discriminated on `kind` so `analysis` is required iff kind === 'analysis'
// ---------------------------------------------------------------------------

const chatMessageBase = {
  id: z.string(),
  sessionId: z.string(),
  role: MessageRole,
  content: z.string(),
  createdAt: z.iso.datetime(),
  /** MOCK: authored per fixture message; live input uses `estimateTokens`. */
  tokenEstimate: z.number().int().min(0),
  /** Non-empty ⇒ the message renders a save-to-memory badge. */
  memoryEffects: z.array(MemoryEffect).optional(),
}

export const ChatMessage = z.discriminatedUnion('kind', [
  z.object({ ...chatMessageBase, kind: z.literal('text') }),
  z.object({
    ...chatMessageBase,
    kind: z.literal('analysis'),
    analysis: JobAnalysis,
  }),
])
export type ChatMessage = z.infer<typeof ChatMessage>

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const ChatSessionSummary = z.object({
  id: z.string(),
  title: z.string(),
  preview: z.string(),
  messageCount: z.number().int().min(0),
  evaluationCount: z.number().int().min(0),
  tokensUsed: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  status: SessionStatus,
})
export type ChatSessionSummary = z.infer<typeof ChatSessionSummary>

export const ChatSession = ChatSessionSummary.extend({
  userId: z.string(),
})
export type ChatSession = z.infer<typeof ChatSession>

// ---------------------------------------------------------------------------
// Session memory
// ---------------------------------------------------------------------------

export const ContextSummary = z.object({
  id: z.string(),
  coversMessageIds: z.array(z.string()),
  coversRange: z.object({ from: z.string(), to: z.string() }),
  originalTokens: z.number().int().min(0),
  summaryTokens: z.number().int().min(0),
  /** "[Earlier: …]" — MOCK: static fixture text. */
  text: z.string(),
  createdAt: z.iso.datetime(),
})
export type ContextSummary = z.infer<typeof ContextSummary>

export const SessionMemoryPolicy = z.object({
  strategy: MemoryStrategy,
  budgetTokens: z.number().int().min(1),
  reserveTokens: z.number().int().min(0),
  summaryTokenCost: z.number().int().min(0),
})
export type SessionMemoryPolicy = z.infer<typeof SessionMemoryPolicy>

export const SessionMemoryState = z.object({
  sessionId: z.string(),
  policy: SessionMemoryPolicy,
  budgetTokens: z.number().int().min(1),
  verbatimTokens: z.number().int().min(0),
  summarizedTokens: z.number().int().min(0),
  verbatimMessageIds: z.array(z.string()),
  summaries: z.array(ContextSummary),
  utilization: z.number().min(0),
  overflowed: z.boolean(),
})
export type SessionMemoryState = z.infer<typeof SessionMemoryState>

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export const SendMessageRequest = z.object({
  // The `max` is a real input-size guard — job descriptions are pasted, and unbounded
  // input is the one denial-of-service vector this front-end actually has.
  content: z
    .string()
    .min(1, { error: 'Message cannot be empty' })
    .max(8000, { error: 'Message too long' }),
})
export type SendMessageRequest = z.infer<typeof SendMessageRequest>

export const PatchFactRequest = z.object({
  pinned: z.boolean(),
})
export type PatchFactRequest = z.infer<typeof PatchFactRequest>

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export const SessionsResponse = z.object({
  sessions: z.array(ChatSessionSummary),
  activeSessionId: z.string().nullable(),
})
export type SessionsResponse = z.infer<typeof SessionsResponse>

export const SessionResponse = z.object({
  session: ChatSession,
  messages: z.array(ChatMessage),
  sessionMemory: SessionMemoryState,
})
export type SessionResponse = z.infer<typeof SessionResponse>

export const SendMessageResponse = z.object({
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
  sessionMemory: SessionMemoryState,
  memoryEffects: z.array(MemoryEffect),
  longTermMemory: z.array(MemoryFact),
})
export type SendMessageResponse = z.infer<typeof SendMessageResponse>

export const MemoryResponse = z.object({
  facts: z.array(MemoryFact),
  updatedAt: z.iso.datetime(),
  counts: z.record(MemoryCategory, z.number().int().min(0)),
})
export type MemoryResponse = z.infer<typeof MemoryResponse>

export const DeleteFactResponse = z.object({
  ok: z.literal(true),
  factId: z.string(),
})
export type DeleteFactResponse = z.infer<typeof DeleteFactResponse>

export const ResetResponse = z.object({
  ok: z.literal(true),
  seed: z.string(),
})
export type ResetResponse = z.infer<typeof ResetResponse>

export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})
export type ErrorResponse = z.infer<typeof ErrorResponse>
