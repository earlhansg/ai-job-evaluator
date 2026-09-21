import { USER_ID, VALIDATE_OUTBOUND } from '@/lib/config'
import { errorResponse, jsonResponse, route } from '@/lib/api/responses'
import { computeSessionMemoryFor } from '@/lib/memory/session-memory'
import { SessionResponse } from '@/lib/schemas'
import { getStore } from '@/lib/store/index'

export const dynamic = 'force-dynamic'

export const GET = route(
  async (req: Request, { params }: { params: Promise<{ sessionId: string }> }) => {
    // 1. PARSE
    const { sessionId } = await params

    // 3. DELEGATE
    const started = Date.now()
    const store = getStore()
    const session = await store.getSession(USER_ID, sessionId)
    if (!session) {
      return errorResponse(404, 'SESSION_NOT_FOUND', `No session ${sessionId} for user ${USER_ID}`)
    }
    const messages = await store.getMessages(USER_ID, sessionId)
    const existingSummaries = await store.getSummaries(USER_ID, sessionId)
    const latencyMs = Date.now() - started

    // 4. SHAPE — computing session memory is the only domain logic permitted in a handler.
    const payload = {
      session,
      messages,
      sessionMemory: computeSessionMemoryFor({
        sessionId,
        messages,
        existingSummaries,
      }),
    }
    if (VALIDATE_OUTBOUND) SessionResponse.parse(payload)

    return jsonResponse(payload, { latencyMs })
  },
)
