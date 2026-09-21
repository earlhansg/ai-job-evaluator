import { USER_ID, VALIDATE_OUTBOUND } from '@/lib/config'
import { errorResponse, invalidBodyResponse, jsonResponse, route } from '@/lib/api/responses'
import { DeleteFactResponse, MemoryFact, PatchFactRequest } from '@/lib/schemas'
import { getStore } from '@/lib/store/index'

export const dynamic = 'force-dynamic'

// No OPTIONS handler — Next implements it and sets `Allow` automatically.

export const PATCH = route(
  async (req: Request, { params }: { params: Promise<{ factId: string }> }) => {
    // 1. PARSE
    const { factId } = await params
    const body = await req.json().catch(() => null)
    if (body === null) return errorResponse(400, 'MALFORMED_JSON', 'Request body is not valid JSON')

    // 2. VALIDATE
    const parsed = PatchFactRequest.safeParse(body)
    if (!parsed.success) return invalidBodyResponse(parsed.error.issues)

    // 3. DELEGATE
    const started = Date.now()
    const store = getStore()
    const existing = (await store.listFacts(USER_ID)).find((f) => f.id === factId)
    if (!existing)
      return errorResponse(404, 'FACT_NOT_FOUND', `No fact ${factId} for user ${USER_ID}`)

    const updated = await store.upsertFact(USER_ID, {
      ...existing,
      pinned: parsed.data.pinned,
      updatedAt: new Date().toISOString(),
    })
    const latencyMs = Date.now() - started

    // 4. SHAPE
    if (VALIDATE_OUTBOUND) MemoryFact.parse(updated)
    return jsonResponse(updated, { latencyMs })
  },
)

export const DELETE = route(
  async (req: Request, { params }: { params: Promise<{ factId: string }> }) => {
    // 1. PARSE
    const { factId } = await params

    // 3. DELEGATE
    const started = Date.now()
    const store = getStore()
    const exists = (await store.listFacts(USER_ID)).some((f) => f.id === factId)
    // Deleting an already-deleted fact is a 404, not a 200, so the client can tell the
    // difference between "removed just now" and "was never there".
    if (!exists)
      return errorResponse(404, 'FACT_NOT_FOUND', `No fact ${factId} for user ${USER_ID}`)

    await store.deleteFact(USER_ID, factId)
    const latencyMs = Date.now() - started

    // 4. SHAPE
    const payload = { ok: true as const, factId }
    if (VALIDATE_OUTBOUND) DeleteFactResponse.parse(payload)
    return jsonResponse(payload, { latencyMs })
  },
)
