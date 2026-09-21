/**
 * Every number, date and duration the UI renders goes through this file.
 *
 * `design-system.md` §10 owns the table these implement. Two non-obvious rules:
 *  - **Dates format in UTC.** Fixture timestamps are authored in UTC and the spec's
 *    worked examples (`14 Sep 2026`, `14 Sep, 09:12`) are the UTC rendering of
 *    `2026-09-14T09:12:00.000Z`. Formatting in the viewer's local zone would make
 *    screenshot diffs machine-dependent.
 *  - **Month names come from a fixed table, not `Intl`.** ICU changed the `en-GB`
 *    abbreviation for September from `Sep` to `Sept` (CLDR 42), so `Intl` output
 *    varies by Node build. A twelve-entry array does not.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

const COUNT_FORMAT = new Intl.NumberFormat('en-US')

/** U+2212. A hyphen-minus is a different glyph width and breaks `tabular-nums` columns. */
const MINUS = '\u2212'

/** `1847` → `1,847`. */
export function formatCount(n: number): string {
  return COUNT_FORMAT.format(n)
}

/** `1847, 2000` → `1,847 / 2,000 tokens`. The unit appears once. */
export function formatTokenBudget(used: number, budget: number): string {
  return `${formatCount(used)} / ${formatCount(budget)} tokens`
}

/** A match score is an integer 0–100 and never carries a `%`. */
export function formatScore(n: number): string {
  return String(Math.round(n))
}

/** Integer percent, one decimal only below 10%. */
export function formatPercent(fraction: number): string {
  const pct = fraction * 100
  return pct < 10 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`
}

/** Signed delta with a real minus sign: `+12`, `${MINUS}3`. */
export function formatDelta(n: number): string {
  if (n < 0) return `${MINUS}${formatCount(Math.abs(n))}`
  return `+${formatCount(n)}`
}

/** `2026-09-14T09:12:00.000Z` → `14 Sep 2026`. Never numeric-only. */
export function formatAbsoluteDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** `2026-09-14T09:12:00.000Z` → `14 Sep, 09:12` (24h). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${hh}:${mm}`
}

/**
 * `design-system.md` §10 thresholds. `now` is injected so callers — and tests — are
 * deterministic; a function that reads the wall clock passes today and fails next week.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)

  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`

  const d = new Date(then)
  const sameYear = d.getUTCFullYear() === new Date(now).getUTCFullYear()
  const stem = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
  return sameYear ? stem : `${stem} ${d.getUTCFullYear()}`
}
