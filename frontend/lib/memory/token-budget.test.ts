/**
 * Boundary coverage for the compaction algorithm.
 *
 * Import style is not optional: relative paths with an explicit `.ts` extension.
 * `node --test` does not resolve tsconfig `@/*` aliases, and extensionless relative
 * imports fail under ESM. Node 24 runs `.ts` in strip-only mode, so no `enum`,
 * no namespaces, no parameter properties in anything reachable from here.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { computeSessionMemory } from './token-budget.ts'
import type { ChatMessage, ContextSummary, SessionMemoryPolicy } from '../schemas.ts'

const POLICY: SessionMemoryPolicy = {
  strategy: 'hybrid-token-buffer',
  budgetTokens: 2000,
  reserveTokens: 128,
  summaryTokenCost: 60,
}

/** effectiveBudget with no existing summary: 2000 - 128 - 0 */
const EFFECTIVE = POLICY.budgetTokens - POLICY.reserveTokens
/** effectiveBudget with an existing summary: 2000 - 128 - 60 */
const EFFECTIVE_WITH_SUMMARY = EFFECTIVE - POLICY.summaryTokenCost

const NOW = '2026-09-19T08:40:00.000Z'

function makeMessages(specs: Array<{ role: 'user' | 'assistant'; tokens: number }>): ChatMessage[] {
  return specs.map((spec, i) => ({
    id: `m_${String(i + 1).padStart(3, '0')}`,
    sessionId: 's_test',
    role: spec.role,
    kind: 'text',
    content: 'x',
    createdAt: NOW,
    tokenEstimate: spec.tokens,
  }))
}

/** Alternating user/assistant messages, each worth `tokens`. */
function alternating(count: number, tokens: number): ChatMessage[] {
  return makeMessages(
    Array.from({ length: count }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      tokens,
    })),
  )
}

function compute(messages: ChatMessage[], existingSummaries: ContextSummary[] = []) {
  return computeSessionMemory({
    sessionId: 's_test',
    messages,
    policy: POLICY,
    existingSummaries,
    now: NOW,
  })
}

describe('computeSessionMemory', () => {
  test('empty — no messages produces an empty verbatim window and no overflow', () => {
    const state = compute([])

    assert.deepEqual(state.verbatimMessageIds, [])
    assert.equal(state.verbatimTokens, 0)
    assert.equal(state.summarizedTokens, 0)
    assert.equal(state.overflowed, false)
    assert.deepEqual(state.summaries, [])
    assert.equal(state.utilization, 0)
  })

  test('under budget — everything stays verbatim, no summary', () => {
    // 4 × 100 = 400, comfortably under 1872.
    const messages = alternating(4, 100)
    const state = compute(messages)

    assert.equal(state.verbatimMessageIds.length, 4)
    assert.equal(state.verbatimTokens, 400)
    assert.equal(state.summarizedTokens, 0)
    assert.equal(state.overflowed, false)
    assert.deepEqual(state.summaries, [])
  })

  test('exactly at budget — the boundary is `<=`, so nothing overflows', () => {
    // 4 messages summing to exactly effectiveBudget (1872): 468 × 4.
    const messages = alternating(4, EFFECTIVE / 4)
    assert.equal(
      messages.reduce((t, m) => t + m.tokenEstimate, 0),
      EFFECTIVE,
      'precondition: the fixture sums to exactly the effective budget',
    )

    const state = compute(messages)

    assert.equal(state.verbatimTokens, EFFECTIVE)
    assert.equal(state.verbatimMessageIds.length, 4)
    assert.equal(state.overflowed, false)
    assert.deepEqual(state.summaries, [])
  })

  test('over budget — overflow is non-empty and exactly one summary is emitted', () => {
    // 6 × 400 = 2400 > 1872. Newest→oldest fits 4 (1600); the 5th would hit 2000.
    const messages = alternating(6, 400)
    const state = compute(messages)

    assert.equal(state.overflowed, true)
    assert.equal(state.summaries.length, 1)
    assert.ok(state.summarizedTokens > 0)
    assert.equal(
      state.verbatimTokens + state.summarizedTokens,
      2400,
      'every message is either verbatim or summarized — none is dropped',
    )

    const summary = state.summaries[0]
    assert.equal(summary.originalTokens, state.summarizedTokens)
    assert.equal(summary.summaryTokens, POLICY.summaryTokenCost)
    assert.equal(summary.coversMessageIds.length, messages.length - state.verbatimMessageIds.length)
    assert.equal(summary.coversRange.from, summary.coversMessageIds[0])
    assert.equal(
      summary.coversRange.to,
      summary.coversMessageIds[summary.coversMessageIds.length - 1],
    )
    assert.match(summary.text, /^\[Earlier: .+\]$/)
  })

  test('pair-split boundary — a cut landing on an assistant message pulls its user message in', () => {
    // 6 × 400 = 2400. Newest→oldest: 400, 800, 1200, 1600; adding the 5th → 2000 > 1872.
    // So the natural cut is index 2 (m_003, a user message)... construct the assistant
    // case explicitly by making the newest message cheap enough to shift the boundary.
    // tokens:            m_001  m_002  m_003  m_004  m_005  m_006
    //                      500    500    500    300    300     30
    // newest→oldest: 30, 330, 630, 1130, 1630; adding m_001 → 2130 > 1872.
    // Natural cut = index 1 = m_002, an ASSISTANT message → pair rule pulls in m_001.
    const messages = makeMessages([
      { role: 'user', tokens: 500 },
      { role: 'assistant', tokens: 500 },
      { role: 'user', tokens: 500 },
      { role: 'assistant', tokens: 300 },
      { role: 'user', tokens: 300 },
      { role: 'assistant', tokens: 30 },
    ])

    const state = compute(messages)

    assert.equal(
      state.verbatimMessageIds[0],
      'm_001',
      'the user message preceding the assistant boundary is pulled into the verbatim window',
    )
    assert.equal(state.verbatimMessageIds.length, 6)
    assert.equal(
      state.verbatimTokens,
      2130,
      'the window is allowed past effectiveBudget — the reserve absorbs the overshoot',
    )
    assert.equal(state.overflowed, false, 'nothing is left over once the pair is rejoined')
  })

  test('pair-split boundary — the overflow set ends on an assistant message', () => {
    // tokens:            m_001  m_002  m_003  m_004  m_005  m_006  m_007  m_008
    //                      400    400    400    400    600    600    600     30
    // newest→oldest: 30, 630, 1230, 1830; adding m_004 → 2230 > 1872.
    // Natural cut = index 4 = m_005, a USER message — no pair rule. Shift by making
    // m_005 assistant-led instead: start the array on an assistant message.
    const messages = makeMessages([
      { role: 'user', tokens: 400 },
      { role: 'assistant', tokens: 400 },
      { role: 'user', tokens: 400 },
      { role: 'assistant', tokens: 400 },
      { role: 'user', tokens: 600 },
      { role: 'assistant', tokens: 600 },
      { role: 'user', tokens: 600 },
      { role: 'assistant', tokens: 30 },
    ])

    // newest→oldest: 30, 630, 1230, 1830 (m_005); adding m_004 → 2230 > 1872.
    // Cut = m_005, a user message, so the pair rule does NOT fire here.
    const state = compute(messages)
    assert.equal(state.verbatimMessageIds[0], 'm_005')
    assert.equal(state.overflowed, true)

    const summary = state.summaries[0]
    assert.equal(summary.coversMessageIds.length, 4)
    assert.equal(
      messages[3].role,
      'assistant',
      'the overflow set ends on an assistant message — the pair m_003/m_004 is intact',
    )
    assert.equal(summary.coversRange.to, 'm_004')
  })

  test('pair-split clamp — the boundary never pushes past index 0', () => {
    // A single oversized assistant message. The safety clamp keeps it verbatim rather
    // than emptying the transcript, and the pair rule must not walk off the front.
    const messages = makeMessages([{ role: 'assistant', tokens: 5000 }])
    const state = compute(messages)

    assert.deepEqual(state.verbatimMessageIds, ['m_001'])
    assert.equal(state.overflowed, false)
  })

  test('existing summary — summaryTokenCost is subtracted only when summaries exist', () => {
    // Sized to sit between the two effective budgets: 1812 < total <= 1872.
    const tokens = EFFECTIVE_WITH_SUMMARY + 20 // 1832
    assert.ok(tokens > EFFECTIVE_WITH_SUMMARY && tokens <= EFFECTIVE)

    const messages = makeMessages([{ role: 'user', tokens }])

    const withoutSummary = compute(messages)
    assert.equal(withoutSummary.overflowed, false, 'fits when no summary cost is charged')

    const existing: ContextSummary = {
      id: 'cs_existing',
      coversMessageIds: ['m_000'],
      coversRange: { from: 'm_000', to: 'm_000' },
      originalTokens: 300,
      summaryTokens: 60,
      text: '[Earlier: prior context]',
      createdAt: '2026-09-18T08:00:00.000Z',
    }

    // With a summary present the budget shrinks by 60; the same lone message no longer
    // fits, but the safety clamp keeps it verbatim rather than emptying the transcript.
    const withSummary = compute(messages, [existing])
    assert.equal(withSummary.verbatimMessageIds.length, 1)
    assert.equal(withSummary.overflowed, false)
  })

  test('existing summary is extended, not duplicated', () => {
    const messages = alternating(6, 400)
    const existing: ContextSummary = {
      id: 'cs_existing',
      coversMessageIds: ['m_001'],
      coversRange: { from: 'm_001', to: 'm_001' },
      originalTokens: 400,
      summaryTokens: 60,
      text: '[Earlier: prior context]',
      createdAt: '2026-09-18T08:00:00.000Z',
    }

    const state = compute(messages, [existing])

    assert.equal(state.summaries.length, 1, 'a session never accumulates a second summary')
    assert.equal(state.summaries[0].id, 'cs_existing', 'the existing summary is extended in place')
    assert.equal(state.summaries[0].createdAt, existing.createdAt)
    assert.ok(state.summaries[0].coversMessageIds.length > 1)
  })

  test('utilization is measured against budgetTokens, not effectiveBudget', () => {
    const messages = makeMessages([{ role: 'user', tokens: 1000 }])
    const state = compute(messages)

    assert.equal(state.utilization, 1000 / POLICY.budgetTokens)
    assert.equal(state.budgetTokens, POLICY.budgetTokens)
  })

  test('an injected summary resolver supplies the text; the fallback covers a miss', () => {
    const messages = alternating(6, 400)

    const resolved = computeSessionMemory({
      sessionId: 's_test',
      messages,
      policy: POLICY,
      resolveSummaryText: () => '[Earlier: authored text]',
      now: NOW,
    })
    assert.equal(resolved.summaries[0].text, '[Earlier: authored text]')

    const missed = computeSessionMemory({
      sessionId: 's_test',
      messages,
      policy: POLICY,
      resolveSummaryText: () => undefined,
      now: NOW,
    })
    assert.match(missed.summaries[0].text, /^\[Earlier: \d+ earlier messages summarized\]$/)
  })
})
