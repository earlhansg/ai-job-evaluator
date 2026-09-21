/**
 * MOCK summary text lookup, keyed by the exact overflow set a compaction covers.
 *
 * Real summarization runs an LLM over the overflow set. Here the text is authored in
 * `fixtures/summaries.json`. Free-form input can produce an overflow set nobody
 * anticipated, so a miss returns `undefined` and the caller falls back to the generic
 * line in `lib/memory/token-budget.ts` — an unmatched lookup must never render an
 * empty compaction row.
 */
import summariesFixture from './fixtures/summaries.json'

type AuthoredSummary = {
  sessionId: string
  coversMessageIds: string[]
  text: string
}

const AUTHORED = summariesFixture.authored as AuthoredSummary[]

function keyFor(sessionId: string, coversMessageIds: string[]): string {
  return `${sessionId}::${coversMessageIds.join(',')}`
}

const BY_COVERAGE = new Map(
  AUTHORED.map((entry) => [keyFor(entry.sessionId, entry.coversMessageIds), entry.text]),
)

/** Returns the authored text for this overflow set, or `undefined` if none exists. */
export function lookupSummaryText(
  sessionId: string,
  coversMessageIds: string[],
): string | undefined {
  return BY_COVERAGE.get(keyFor(sessionId, coversMessageIds))
}

/** Summaries a session ships with. All empty — the demo's first one materializes live. */
export function seededSummaries(sessionId: string): unknown[] {
  const seeded = summariesFixture.seeded as Record<string, unknown[]>
  return seeded[sessionId] ?? []
}
