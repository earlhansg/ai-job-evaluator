/**
 * MOCK write path: turns a user message into a scripted reply plus its memory effects.
 *
 * Lives here rather than in the route handler so `POST …/messages` stays at four steps.
 * It takes the store as a parameter — it never imports an implementation, so it works
 * unchanged once Redis lands.
 */
import { computeSessionMemoryFor } from '@/lib/memory/session-memory'
import { estimateTokens } from '@/lib/memory/estimate-tokens'
import { JOB_DESCRIPTION_TOKEN_ESTIMATE, matchScriptedReply } from '@/lib/mock/scripted-replies'
import type { FactUpsert } from '@/lib/mock/scripted-replies'
import type { ChatMessage, MemoryEffect, MemoryFact, SendMessageResponse } from '@/lib/schemas'
import type { ChatStore } from '@/lib/store/types'

let counter = 0
function messageId(prefix: string): string {
  counter += 1
  return `m_${prefix}_${Date.now().toString(36)}_${counter}`
}

export async function sendScriptedMessage(
  store: ChatStore,
  userId: string,
  sessionId: string,
  content: string,
): Promise<SendMessageResponse> {
  const reply = matchScriptedReply(content)
  const createdAt = new Date().toISOString()

  // A pasted job description costs an authored 430 tokens regardless of its length, so
  // the tuned demo moment lands the same way whatever the reviewer pastes. Anything
  // else is measured with the mock chars/4 heuristic.
  const userMessage: ChatMessage = {
    id: messageId('u'),
    sessionId,
    role: 'user',
    kind: 'text',
    content,
    createdAt,
    tokenEstimate:
      reply.trigger === 'job-description'
        ? JOB_DESCRIPTION_TOKEN_ESTIMATE
        : estimateTokens(content),
  }

  const memoryEffects = await applyFactUpserts(store, userId, sessionId, reply.factUpserts, {
    messageId: userMessage.id,
    at: createdAt,
  })

  const assistantMessage: ChatMessage =
    reply.kind === 'analysis' && reply.analysis
      ? {
          id: messageId('a'),
          sessionId,
          role: 'assistant',
          kind: 'analysis',
          content: reply.content,
          createdAt,
          tokenEstimate: reply.tokenEstimate,
          analysis: reply.analysis,
          ...(memoryEffects.length > 0 ? { memoryEffects } : {}),
        }
      : {
          id: messageId('a'),
          sessionId,
          role: 'assistant',
          kind: 'text',
          content: reply.content,
          createdAt,
          tokenEstimate: reply.tokenEstimate,
          ...(memoryEffects.length > 0 ? { memoryEffects } : {}),
        }

  await store.appendMessage(userId, sessionId, userMessage)
  await store.appendMessage(userId, sessionId, assistantMessage)

  const messages = await store.getMessages(userId, sessionId)
  const existingSummaries = await store.getSummaries(userId, sessionId)
  const sessionMemory = computeSessionMemoryFor({
    sessionId,
    messages,
    existingSummaries,
  })

  // The algorithm decides *what* the summary is; persisting it is this layer's job.
  for (const summary of sessionMemory.summaries) {
    await store.putSummary(userId, sessionId, summary)
  }

  return {
    userMessage,
    assistantMessage,
    sessionMemory,
    memoryEffects,
    // The FULL post-write memory array, not a delta — Panel 3 updates from this one
    // response. Keep it that way when Redis lands.
    longTermMemory: await store.listFacts(userId),
  }
}

async function applyFactUpserts(
  store: ChatStore,
  userId: string,
  sessionId: string,
  upserts: FactUpsert[],
  origin: { messageId: string; at: string },
): Promise<MemoryEffect[]> {
  if (upserts.length === 0) return []

  const existing = new Map((await store.listFacts(userId)).map((f) => [f.id, f]))
  const effects: MemoryEffect[] = []

  for (const upsert of upserts) {
    const prior = existing.get(upsert.factId)

    const next: MemoryFact = prior
      ? {
          ...prior,
          value: upsert.seed.value,
          confidence: upsert.seed.confidence,
          // Bumped here rather than in the store, so a pin toggle via PATCH never
          // inflates "cited in N evaluations".
          hitCount: prior.hitCount + 1,
          updatedAt: origin.at,
        }
      : {
          id: upsert.factId,
          userId,
          category: upsert.seed.category,
          label: upsert.seed.label,
          value: upsert.seed.value,
          confidence: upsert.seed.confidence,
          pinned: false,
          hitCount: 1,
          source: { sessionId, messageId: origin.messageId },
          createdAt: origin.at,
          updatedAt: origin.at,
        }

    const saved = await store.upsertFact(userId, next)

    // A trigger row declares `created`, but the fact may already exist from an earlier
    // send or from the fixtures. Report what actually happened, not what was scripted.
    const action = prior ? (upsert.action === 'created' ? 'reinforced' : upsert.action) : 'created'
    effects.push({
      factId: saved.id,
      action,
      label: `Saved to memory — ${saved.label}`,
    })
  }

  return effects
}
