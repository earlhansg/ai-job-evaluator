/**
 * The hybrid token-budget buffer — the one piece of genuinely real logic in this phase.
 *
 * Keep the newest messages verbatim while their cumulative token cost fits a budget;
 * fold everything older into a single visible `ContextSummary`. Mirrors LangChain's
 * `ConversationSummaryBufferMemory` and Claude's context compaction.
 *
 * THIS MODULE MUST STAY PURE AND SYNCHRONOUS.
 *   - No I/O, no `Date.now()` without an injected override, no randomness.
 *   - No value imports from `lib/store/` or `lib/mock/` — types only.
 * It is the one module that lifts verbatim into a backend service later, and the
 * `node --test` runner enforces the rule: it does not resolve tsconfig `@/*` aliases,
 * but `import type` is erased before Node ever resolves it. A stray value import
 * breaks the unit tests immediately. The friction is the feature.
 *
 * Persisting an emitted summary is the caller's job (`store.putSummary()`).
 */
import type {
  ChatMessage,
  ContextSummary,
  SessionMemoryPolicy,
  SessionMemoryState,
} from '@/lib/schemas'

export type ComputeSessionMemoryInput = {
  sessionId: string
  /** Oldest → newest. */
  messages: ChatMessage[]
  policy: SessionMemoryPolicy
  /** Summaries already persisted for this session. Empty on a fresh session. */
  existingSummaries?: ContextSummary[]
  /**
   * Resolves the summary *text* for an overflow set. Injected because summary text is
   * MOCK data and this module may not import from `lib/mock/`. Falls back to a generic
   * line when omitted or when the resolver has no authored match — an unmatched lookup
   * returning `undefined` would render an empty compaction row.
   */
  resolveSummaryText?: (overflow: ChatMessage[]) => string | undefined
  /** Injected clock, so the function stays deterministic under test. */
  now?: string
}

export function computeSessionMemory(input: ComputeSessionMemoryInput): SessionMemoryState {
  const { sessionId, messages, policy } = input
  const existingSummaries = input.existingSummaries ?? []

  // 1. Effective budget. The summary block's own cost is only charged once a summary
  //    actually exists — a session that has never overflowed pays nothing for it.
  const effectiveBudget =
    policy.budgetTokens -
    policy.reserveTokens -
    (existingSummaries.length > 0 ? policy.summaryTokenCost : 0)

  // 2–4. Walk newest → oldest, including each message while the running total stays
  //      within the effective budget. `cutIndex` is the index of the oldest message
  //      still held verbatim; everything before it overflows.
  let cutIndex = messages.length
  let runningTokens = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const next = runningTokens + messages[i].tokenEstimate
    if (next > effectiveBudget) break
    runningTokens = next
    cutIndex = i
  }

  // Safety clamp: a single message larger than the whole budget (an 8,000-char paste)
  // would otherwise empty the transcript. Always keep at least the newest message.
  if (messages.length > 0 && cutIndex >= messages.length) {
    cutIndex = messages.length - 1
  }

  // 5. Never split a user/assistant pair. If the oldest verbatim message is an
  //    assistant reply, its prompting user message is in the overflow set — push the
  //    boundary one message older so the pair stays together. This grows the verbatim
  //    window past `effectiveBudget` on purpose; that overshoot is exactly what
  //    `reserveTokens` exists to absorb. The invariant that matters is
  //    `verbatimTokens <= budgetTokens`, not `<= effectiveBudget`.
  if (cutIndex > 0 && messages[cutIndex].role === 'assistant') {
    cutIndex -= 1
  }

  const verbatim = messages.slice(cutIndex)
  const overflow = messages.slice(0, cutIndex)

  const verbatimTokens = sumTokens(verbatim)
  const summarizedTokens = sumTokens(overflow)

  // 6. A non-empty overflow set emits a summary — or extends the existing one, so a
  //    session never accumulates more than one compaction row.
  const summaries: ContextSummary[] =
    overflow.length > 0
      ? [
          buildSummary({
            overflow,
            summarizedTokens,
            policy,
            previous: existingSummaries[0],
            resolveSummaryText: input.resolveSummaryText,
            now: input.now,
          }),
        ]
      : []

  // 7. `utilization` is measured against the full budget, not the effective budget —
  //    it is what the meter renders as `1,847 / 2,000`.
  return {
    sessionId,
    policy,
    budgetTokens: policy.budgetTokens,
    verbatimTokens,
    summarizedTokens,
    verbatimMessageIds: verbatim.map((m) => m.id),
    summaries,
    utilization: policy.budgetTokens > 0 ? verbatimTokens / policy.budgetTokens : 0,
    overflowed: overflow.length > 0,
  }
}

function sumTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, m) => total + m.tokenEstimate, 0)
}

function buildSummary(args: {
  overflow: ChatMessage[]
  summarizedTokens: number
  policy: SessionMemoryPolicy
  previous?: ContextSummary
  resolveSummaryText?: (overflow: ChatMessage[]) => string | undefined
  now?: string
}): ContextSummary {
  const { overflow, summarizedTokens, policy, previous, now } = args
  const first = overflow[0]
  const last = overflow[overflow.length - 1]
  const text = args.resolveSummaryText?.(overflow) ?? fallbackSummaryText(overflow.length)

  return {
    // Extending keeps the original id and creation time so the UI treats it as the
    // same compaction row growing, not a new one appearing.
    id: previous?.id ?? `cs_${first.id}_${last.id}`,
    coversMessageIds: overflow.map((m) => m.id),
    coversRange: { from: first.id, to: last.id },
    originalTokens: summarizedTokens,
    summaryTokens: policy.summaryTokenCost,
    text,
    createdAt: previous?.createdAt ?? now ?? new Date().toISOString(),
  }
}

/** Generic compaction text for an overflow set with no authored summary. */
export function fallbackSummaryText(coveredCount: number): string {
  return `[Earlier: ${coveredCount} earlier message${coveredCount === 1 ? '' : 's'} summarized]`
}
