/**
 * Makes fixture timestamps relative to "now" at seed time.
 *
 * The fixtures are authored with absolute ISO timestamps, so Panel 1's Today / This
 * week / Earlier grouping used to drift with real time until everything collapsed into
 * "Earlier". Shifting every `createdAt` / `updatedAt` by one offset keeps relative
 * ages, ordering and every hand-tuned token value intact. The JSON on disk is never
 * edited, so `fixture-tuning.test.ts` keeps guarding the raw values.
 *
 * Pure and import-free, so it loads under bare `node --test`.
 */

/** The newest timestamp across the fixtures (`s_onsite_rejects.updatedAt`). */
export const FIXTURE_ANCHOR = '2026-09-19T08:40:00.000Z'

/** Where the anchor lands relative to now: "20m ago" on first paint. */
export const ANCHOR_AGE_MS = 20 * 60 * 1000

const TIMESTAMP_KEYS = new Set(['createdAt', 'updatedAt'])

/** The shift that lands `FIXTURE_ANCHOR` exactly `ANCHOR_AGE_MS` before `now`. */
export function rebaseOffset(now: number): number {
  return now - ANCHOR_AGE_MS - Date.parse(FIXTURE_ANCHOR)
}

/** Deep-copies `value`, shifting every `createdAt` / `updatedAt` string by `offsetMs`. Other fields untouched. */
export function shiftTimestamps<T>(value: T, offsetMs: number): T {
  return shift(value, offsetMs) as T
}

function shift(value: unknown, offsetMs: number): unknown {
  if (Array.isArray(value)) return value.map((item) => shift(item, offsetMs))
  if (typeof value !== 'object' || value === null) return value

  const out: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    out[key] =
      TIMESTAMP_KEYS.has(key) && typeof entry === 'string'
        ? new Date(Date.parse(entry) + offsetMs).toISOString()
        : shift(entry, offsetMs)
  }
  return out
}
