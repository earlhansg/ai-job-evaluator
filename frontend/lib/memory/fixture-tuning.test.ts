/**
 * Demo-integrity regression test.
 *
 * `CLAUDE.md` → Notes & Gotchas: "Fixture `tokenEstimate` values are authored by hand.
 * Editing fixture message text without updating them will desync the demo." This test
 * is the guard rail for exactly that. It converts a silent demo failure — discovered in
 * Phase 4 as a mysterious E2E red — into an immediate, local, readable unit failure.
 *
 * Fixtures are read with `node:fs` rather than imported, so this file needs neither a
 * tsconfig path alias nor JSON import attributes to run under bare `node --test`.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { computeSessionMemory } from './token-budget.ts'
import type { ChatMessage, ContextSummary, SessionMemoryPolicy } from '../schemas.ts'

function readFixture<T>(name: string): T {
  const path = fileURLToPath(new URL(`../mock/fixtures/${name}`, import.meta.url))
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

const messagesBySession = readFixture<Record<string, ChatMessage[]>>('messages.json')
const sessions =
  readFixture<Array<{ id: string; tokensUsed: number; messageCount: number }>>('sessions.json')
const summaries = readFixture<{
  seeded: Record<string, ContextSummary[]>
  authored: Array<{
    sessionId: string
    coversMessageIds: string[]
    text: string
  }>
}>('summaries.json')

// Mirrors lib/config.ts. Duplicated rather than imported because `lib/config.ts` reads
// `process.env`, and this test must stay independent of the ambient environment.
const SESSION_TOKEN_BUDGET = 2000
const POLICY: SessionMemoryPolicy = {
  strategy: 'hybrid-token-buffer',
  budgetTokens: SESSION_TOKEN_BUDGET,
  reserveTokens: 128,
  summaryTokenCost: 60,
}

const DEMO_SESSION = 's_onsite_rejects'
const NOW = '2026-09-19T09:00:00.000Z'

/** The scripted send: a pasted job description and its analysis reply. */
const SCRIPTED_SEND: ChatMessage[] = [
  {
    id: 'm_013',
    sessionId: DEMO_SESSION,
    role: 'user',
    kind: 'text',
    content: 'pasted job description',
    createdAt: NOW,
    tokenEstimate: 430,
  },
  {
    id: 'm_014',
    sessionId: DEMO_SESSION,
    role: 'assistant',
    kind: 'text',
    content: 'analysis reply',
    createdAt: NOW,
    tokenEstimate: 310,
  },
]

function compute(messages: ChatMessage[], existingSummaries: ContextSummary[] = []) {
  return computeSessionMemory({
    sessionId: DEMO_SESSION,
    messages,
    policy: POLICY,
    existingSummaries,
    now: NOW,
  })
}

describe('fixture tuning — the demo compaction moment', () => {
  const seeded = messagesBySession[DEMO_SESSION]

  test('the tuned ledger totals exactly 1,847 tokens across 12 messages', () => {
    assert.equal(seeded.length, 12)
    assert.equal(
      seeded.reduce((t, m) => t + m.tokenEstimate, 0),
      1847,
    )
  })

  test('session metadata agrees with the message ledger', () => {
    for (const session of sessions) {
      const messages = messagesBySession[session.id]
      assert.ok(messages, `no messages fixture for ${session.id}`)
      assert.equal(session.messageCount, messages.length, `${session.id}: messageCount`)
      assert.equal(
        session.tokensUsed,
        messages.reduce((t, m) => t + m.tokenEstimate, 0),
        `${session.id}: tokensUsed must equal the sum of its message tokenEstimates`,
      )
    }
  })

  test('at load the demo session does NOT overflow and has no summary (AB-01 baseline)', () => {
    assert.deepEqual(
      summaries.seeded[DEMO_SESSION],
      [],
      'no summary may be pre-baked — AB-05 asserts none exists at load',
    )

    const state = compute(seeded, summaries.seeded[DEMO_SESSION])

    assert.equal(state.overflowed, false)
    assert.equal(state.summaries.length, 0)
    assert.equal(state.verbatimTokens, 1847)
    assert.equal(state.verbatimMessageIds.length, 12)
  })

  test('after the scripted send it overflows with exactly one summary', () => {
    const after = [...seeded, ...SCRIPTED_SEND]
    const state = compute(after, summaries.seeded[DEMO_SESSION])

    assert.equal(state.overflowed, true)
    assert.equal(state.summaries.length, 1)
  })

  test('post-compaction the verbatim window stays within the budget (AB-05 meter)', () => {
    const after = [...seeded, ...SCRIPTED_SEND]
    const state = compute(after, summaries.seeded[DEMO_SESSION])

    assert.ok(
      state.verbatimTokens <= SESSION_TOKEN_BUDGET,
      `verbatimTokens ${state.verbatimTokens} must be <= aria-valuemax ${SESSION_TOKEN_BUDGET}`,
    )
  })

  test('the pair-split branch fires: the cut lands on an assistant message', () => {
    const after = [...seeded, ...SCRIPTED_SEND]
    const state = compute(after, summaries.seeded[DEMO_SESSION])

    assert.deepEqual(
      state.summaries[0].coversMessageIds,
      ['m_001', 'm_002', 'm_003', 'm_004'],
      'the overflow set is the two seeded evaluations',
    )
    assert.equal(state.verbatimMessageIds[0], 'm_005')
    assert.equal(state.summarizedTokens, 635)
    assert.equal(state.verbatimTokens, 1952)
    assert.equal(state.utilization, 0.976)
  })

  test('the overflow set has an authored summary — no fallback text in the demo', () => {
    const after = [...seeded, ...SCRIPTED_SEND]
    const state = compute(after, summaries.seeded[DEMO_SESSION])
    const covered = state.summaries[0].coversMessageIds.join(',')

    const authored = summaries.authored.find(
      (entry) => entry.sessionId === DEMO_SESSION && entry.coversMessageIds.join(',') === covered,
    )

    assert.ok(authored, `no authored summary text for overflow set [${covered}]`)
    assert.match(authored.text, /^\[Earlier: .+\]$/)
  })

  test('recomputing after the summary is persisted is stable', () => {
    const after = [...seeded, ...SCRIPTED_SEND]
    const first = compute(after, summaries.seeded[DEMO_SESSION])

    // Re-GET: the summary now exists, so its 60-token cost is charged.
    const second = compute(after, first.summaries)

    assert.deepEqual(second.verbatimMessageIds, first.verbatimMessageIds)
    assert.equal(second.summaries.length, 1)
    assert.equal(second.summaries[0].id, first.summaries[0].id, 'the summary is extended in place')
    assert.ok(second.verbatimTokens <= SESSION_TOKEN_BUDGET)
  })
})

describe('fixture tuning — adversarial fixtures (PRD-ONE §14 R1)', () => {
  const analyses = Object.values(messagesBySession)
    .flat()
    .filter((m) => m.kind === 'analysis')

  test('at least one analysis carries 15 or more criteria', () => {
    assert.ok(analyses.some((m) => m.analysis.criteria.length >= 15))
  })

  test('at least one criterion label is 200 characters or longer', () => {
    const labels = analyses.flatMap((m) => m.analysis.criteria.map((c) => c.label))
    assert.ok(labels.some((label) => label.length >= 200))
  })

  test('at least one criterion has an empty detail and one has none at all', () => {
    const criteria = analyses.flatMap((m) => m.analysis.criteria)
    assert.ok(
      criteria.some((c) => c.detail === ''),
      'an empty-string detail must render gracefully',
    )
    assert.ok(
      criteria.some((c) => c.detail === undefined),
      'an absent optional detail must render gracefully',
    )
  })

  test('at least one analysis omits the optional compensation field', () => {
    assert.ok(analyses.some((m) => m.analysis.compensation === undefined))
  })

  test('there are at least 4 sessions and one has exactly 1 message (AB-01)', () => {
    assert.ok(sessions.length >= 4)
    assert.ok(sessions.some((s) => s.messageCount === 1))
  })

  test('none of the adversarial fixtures live in the load-bearing demo session', () => {
    const demoAnalyses = messagesBySession[DEMO_SESSION].filter((m) => m.kind === 'analysis')
    for (const message of demoAnalyses) {
      assert.ok(message.analysis.criteria.length < 15)
      for (const criterion of message.analysis.criteria) {
        assert.ok(criterion.label.length < 200)
      }
    }
  })
})
