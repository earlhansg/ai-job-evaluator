/**
 * Applies the project's memory policy to a session.
 *
 * This is the only place `computeSessionMemory` is called from. It exists so that
 * `token-budget.ts` can stay pure and free of both config and mock data, while route
 * handlers stay at four steps and never read a fixture themselves.
 */
import { RESERVE_TOKENS, SESSION_TOKEN_BUDGET, SUMMARY_TOKEN_COST } from '@/lib/config'
import { lookupSummaryText } from '@/lib/mock/summary-text'
import { computeSessionMemory } from '@/lib/memory/token-budget'
import type {
  ChatMessage,
  ContextSummary,
  SessionMemoryPolicy,
  SessionMemoryState,
} from '@/lib/schemas'

export const SESSION_MEMORY_POLICY: SessionMemoryPolicy = {
  strategy: 'hybrid-token-buffer',
  budgetTokens: SESSION_TOKEN_BUDGET,
  reserveTokens: RESERVE_TOKENS,
  summaryTokenCost: SUMMARY_TOKEN_COST,
}

export function computeSessionMemoryFor(args: {
  sessionId: string
  /** Oldest → newest. */
  messages: ChatMessage[]
  existingSummaries: ContextSummary[]
}): SessionMemoryState {
  return computeSessionMemory({
    sessionId: args.sessionId,
    messages: args.messages,
    policy: SESSION_MEMORY_POLICY,
    existingSummaries: args.existingSummaries,
    resolveSummaryText: (overflow) =>
      lookupSummaryText(
        args.sessionId,
        overflow.map((m) => m.id),
      ),
  })
}
