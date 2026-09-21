import { USER_ID, VALIDATE_OUTBOUND } from '@/lib/config'
import { errorResponse, invalidBodyResponse, jsonResponse, route } from '@/lib/api/responses'
import { sendScriptedMessage } from '@/lib/mock/send-scripted-message'
import { SendMessageRequest, SendMessageResponse } from '@/lib/schemas'
import { getStore } from '@/lib/store/index'

export const dynamic = 'force-dynamic'

export const POST = route(
  async (req: Request, { params }: { params: Promise<{ sessionId: string }> }) => {
    // 1. PARSE
    const { sessionId } = await params
    const body = await req.json().catch(() => null)
    if (body === null) return errorResponse(400, 'MALFORMED_JSON', 'Request body is not valid JSON')

    // 2. VALIDATE
    const parsed = SendMessageRequest.safeParse(body)
    if (!parsed.success) return invalidBodyResponse(parsed.error.issues)

    // 3. DELEGATE
    const started = Date.now()
    const store = getStore()
    const session = await store.getSession(USER_ID, sessionId)
    if (!session) {
      return errorResponse(404, 'SESSION_NOT_FOUND', `No session ${sessionId} for user ${USER_ID}`)
    }
    const result = await sendScriptedMessage(store, USER_ID, sessionId, parsed.data.content)
    const latencyMs = Date.now() - started

    // 4. SHAPE
    if (VALIDATE_OUTBOUND) SendMessageResponse.parse(result)
    return jsonResponse(result, { status: 201, latencyMs })
  },
)
