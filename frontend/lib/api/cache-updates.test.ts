import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  OPTIMISTIC_ID_PREFIX,
  buildOptimisticUserMessage,
  memoryFromFacts,
  withFactRemoved,
  withFactReplaced,
  withOptimisticMessage,
  withSendResult,
} from './cache-updates.ts'
import type {
  ChatMessage,
  MemoryFact,
  SendMessageResponse,
  SessionMemoryState,
  SessionResponse,
} from '../schemas.ts'

const T0 = '2026-09-19T08:00:00.000Z'
const T1 = '2026-09-19T09:00:00.000Z'

function text(id: string, role: 'user' | 'assistant', tokenEstimate: number): ChatMessage {
  return {
    id,
    sessionId: 's_1',
    role,
    kind: 'text',
    content: `${id} body`,
    createdAt: T0,
    tokenEstimate,
  }
}

function memoryState(ids: string[], verbatimTokens: number): SessionMemoryState {
  return {
    sessionId: 's_1',
    policy: {
      strategy: 'hybrid-token-buffer',
      budgetTokens: 2000,
      reserveTokens: 128,
      summaryTokenCost: 60,
    },
    budgetTokens: 2000,
    verbatimTokens,
    summarizedTokens: 0,
    verbatimMessageIds: ids,
    summaries: [],
    utilization: verbatimTokens / 2000,
    overflowed: false,
  }
}

function session(messages: ChatMessage[]): SessionResponse {
  const tokens = messages.reduce((t, m) => t + m.tokenEstimate, 0)
  return {
    session: {
      id: 's_1',
      userId: 'u_demo',
      title: 'Test',
      preview: 'old',
      messageCount: messages.length,
      evaluationCount: 0,
      tokensUsed: tokens,
      createdAt: T0,
      updatedAt: T0,
      status: 'active',
    },
    messages,
    sessionMemory: memoryState(
      messages.map((m) => m.id),
      tokens,
    ),
  }
}

function fact(id: string, category: MemoryFact['category'], updatedAt = T0): MemoryFact {
  return {
    id,
    userId: 'u_demo',
    category,
    label: id,
    value: `${id} value`,
    confidence: 0.9,
    pinned: false,
    hitCount: 1,
    source: { sessionId: 's_1', messageId: 'm_1' },
    createdAt: T0,
    updatedAt,
  }
}

const analysisReply: ChatMessage = {
  id: 'm_4',
  sessionId: 's_1',
  role: 'assistant',
  kind: 'analysis',
  content: 'Analysis of the posting',
  createdAt: T1,
  tokenEstimate: 310,
  analysis: {
    jobTitle: 'Engineer',
    company: 'Co',
    location: 'Berlin',
    workMode: 'onsite',
    matchScore: 40,
    verdict: 'not-recommended',
    criteria: [],
    rationale: 'No.',
    memoryCitations: [],
  },
}

describe('withOptimisticMessage', () => {
  test('appends the message to messages AND verbatimMessageIds', () => {
    const current = session([text('m_1', 'user', 10), text('m_2', 'assistant', 20)])
    const optimistic = buildOptimisticUserMessage('s_1', 'hello', T1, 7)
    const next = withOptimisticMessage(current, optimistic)

    assert.ok(next)
    assert.equal(optimistic.id, `${OPTIMISTIC_ID_PREFIX}7`)
    assert.equal(next.messages.at(-1)?.id, optimistic.id)
    assert.equal(next.sessionMemory.verbatimMessageIds.at(-1), optimistic.id)
    assert.equal(next.sessionMemory.verbatimTokens, current.sessionMemory.verbatimTokens)
    assert.equal(current.messages.length, 2, 'input not mutated')
  })

  test('undefined in, undefined out', () => {
    assert.equal(withOptimisticMessage(undefined, text('m_1', 'user', 1)), undefined)
  })
})

describe('withSendResult', () => {
  const res: SendMessageResponse = {
    userMessage: text('m_3', 'user', 430),
    assistantMessage: analysisReply,
    sessionMemory: memoryState(['m_2', 'm_3', 'm_4'], 760),
    memoryEffects: [],
    longTermMemory: [],
  }

  test('appends exactly the two server messages and drops optimistic ids', () => {
    const committed = session([text('m_1', 'user', 10), text('m_2', 'assistant', 20)])
    // Defensive: even if an optimistic bubble leaked into the committed data.
    committed.messages.push(buildOptimisticUserMessage('s_1', 'hello', T1, 1))

    const next = withSendResult(committed, res)
    assert.ok(next)
    assert.deepEqual(
      next.messages.map((m) => m.id),
      ['m_1', 'm_2', 'm_3', 'm_4'],
    )
    assert.ok(!next.messages.some((m) => m.id.startsWith(OPTIMISTIC_ID_PREFIX)))
  })

  test('recomputes session meta like the store does and takes the server session memory', () => {
    const committed = session([text('m_1', 'user', 10), text('m_2', 'assistant', 20)])
    const next = withSendResult(committed, res)
    assert.ok(next)

    assert.equal(next.session.messageCount, 4)
    assert.equal(next.session.evaluationCount, 1)
    assert.equal(next.session.tokensUsed, 10 + 20 + 430 + 310)
    assert.equal(next.session.preview, analysisReply.content.slice(0, 120))
    assert.equal(next.session.updatedAt, T1)
    assert.equal(next.sessionMemory, res.sessionMemory)
  })

  test('undefined in, undefined out', () => {
    assert.equal(withSendResult(undefined, res), undefined)
  })
})

describe('memory transforms', () => {
  test('memoryFromFacts([]) has every category at zero and the epoch updatedAt', () => {
    const memory = memoryFromFacts([])
    assert.deepEqual(memory.counts, {
      role: 0,
      skill: 0,
      preference: 0,
      dealbreaker: 0,
      compensation: 0,
      location: 0,
    })
    assert.equal(memory.updatedAt, new Date(0).toISOString())
  })

  test('memoryFromFacts counts per category and takes the newest updatedAt', () => {
    const memory = memoryFromFacts([
      fact('f_1', 'skill'),
      fact('f_2', 'skill', T1),
      fact('f_3', 'role'),
    ])
    assert.equal(memory.counts.skill, 2)
    assert.equal(memory.counts.role, 1)
    assert.equal(memory.counts.location, 0)
    assert.equal(memory.updatedAt, T1)
  })

  test('withFactRemoved decrements the right category', () => {
    const current = memoryFromFacts([fact('f_1', 'skill'), fact('f_2', 'dealbreaker')])
    const next = withFactRemoved(current, 'f_2')
    assert.ok(next)
    assert.deepEqual(
      next.facts.map((f) => f.id),
      ['f_1'],
    )
    assert.equal(next.counts.dealbreaker, 0)
    assert.equal(next.counts.skill, 1)
  })

  test('withFactReplaced keeps order and refreshes updatedAt', () => {
    const current = memoryFromFacts([
      fact('f_1', 'skill'),
      fact('f_2', 'role'),
      fact('f_3', 'role'),
    ])
    const next = withFactReplaced(current, { ...fact('f_2', 'role', T1), pinned: true })
    assert.ok(next)
    assert.deepEqual(
      next.facts.map((f) => f.id),
      ['f_1', 'f_2', 'f_3'],
    )
    assert.equal(next.facts[1].pinned, true)
    assert.equal(next.updatedAt, T1)
  })

  test('undefined in, undefined out', () => {
    assert.equal(withFactReplaced(undefined, fact('f_1', 'skill')), undefined)
    assert.equal(withFactRemoved(undefined, 'f_1'), undefined)
  })
})
