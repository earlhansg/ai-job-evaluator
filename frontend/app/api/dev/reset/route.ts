import { IS_PRODUCTION, SEED_ID, USER_ID, VALIDATE_OUTBOUND } from '@/lib/config'
import { errorResponse, jsonResponse, route } from '@/lib/api/responses'
import { ResetResponse } from '@/lib/schemas'
import { getStore } from '@/lib/store/index'

export const dynamic = 'force-dynamic'

/**
 * Restores seeded state, which is what makes the Phase 4 E2E suite repeatable.
 * The mock store deep-clones its fixtures on every seed, so this genuinely restores
 * the original data rather than whatever the last run mutated it into.
 */
export const POST = route(async () => {
  // Gated at the top. 404, not 403 — don't confirm the endpoint exists in production.
  if (IS_PRODUCTION) {
    return errorResponse(404, 'NOT_FOUND', 'Not found')
  }

  const started = Date.now()
  const store = getStore()
  await store.reset(USER_ID)
  const latencyMs = Date.now() - started

  const payload = { ok: true as const, seed: SEED_ID }
  if (VALIDATE_OUTBOUND) ResetResponse.parse(payload)
  return jsonResponse(payload, { latencyMs })
})
