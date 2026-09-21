import { USER_ID, VALIDATE_OUTBOUND } from '@/lib/config'
import { jsonResponse, route } from '@/lib/api/responses'
import { MemoryCategory, MemoryResponse, type MemoryFact } from '@/lib/schemas'
import { getStore } from '@/lib/store/index'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  // 3. DELEGATE
  const started = Date.now()
  const store = getStore()
  const facts = await store.listFacts(USER_ID)
  const latencyMs = Date.now() - started

  // 4. SHAPE
  const payload = {
    facts,
    updatedAt: latestUpdate(facts),
    counts: countByCategory(facts),
  }
  if (VALIDATE_OUTBOUND) MemoryResponse.parse(payload)

  return jsonResponse(payload, { latencyMs })
})

/** Every category is present even at zero, so Panel 3 can render empty groups. */
function countByCategory(facts: MemoryFact[]): Record<string, number> {
  const counts = Object.fromEntries(MemoryCategory.options.map((c) => [c, 0]))
  for (const fact of facts) counts[fact.category] += 1
  return counts
}

function latestUpdate(facts: MemoryFact[]): string {
  return facts.reduce(
    (latest, fact) => (fact.updatedAt > latest ? fact.updatedAt : latest),
    new Date(0).toISOString(),
  )
}
