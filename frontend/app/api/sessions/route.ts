import { USER_ID, VALIDATE_OUTBOUND } from '@/lib/config'
import { jsonResponse, route } from '@/lib/api/responses'
import { SessionsResponse } from '@/lib/schemas'
import { getStore } from '@/lib/store/index'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  // 3. DELEGATE — the store returns the index already sorted by updatedAt desc.
  const started = Date.now()
  const store = getStore()
  const sessions = await store.listSessions(USER_ID)
  const latencyMs = Date.now() - started

  // 4. SHAPE
  const payload = { sessions, activeSessionId: sessions[0]?.id ?? null }
  if (VALIDATE_OUTBOUND) SessionsResponse.parse(payload)

  return jsonResponse(payload, { latencyMs })
})
