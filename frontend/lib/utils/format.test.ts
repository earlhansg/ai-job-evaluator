/**
 * Boundary coverage for the formatting helpers.
 *
 * Same import rules as `lib/memory/token-budget.test.ts`: relative paths with an
 * explicit `.ts` extension, because `node --test` does not resolve the `@/*` alias.
 *
 * Every relative-time assertion passes an explicit `now`. That is the point of the
 * parameter — these tests must give the same answer in a year.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatAbsoluteDate,
  formatCount,
  formatDateTime,
  formatDelta,
  formatPercent,
  formatRelativeTime,
  formatScore,
  formatTokenBudget,
} from './format.ts'

/** 2026-09-19T08:40:00.000Z — the newest fixture `updatedAt`. */
const NOW = Date.parse('2026-09-19T08:40:00.000Z')

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** `NOW` minus `ms`, as an ISO string. */
function ago(ms: number): string {
  return new Date(NOW - ms).toISOString()
}

describe('formatCount', () => {
  test('separates thousands', () => {
    assert.equal(formatCount(1847), '1,847')
    assert.equal(formatCount(2000), '2,000')
  })

  test('leaves small numbers alone', () => {
    assert.equal(formatCount(0), '0')
    assert.equal(formatCount(85), '85')
  })
})

describe('formatTokenBudget', () => {
  test('names the unit exactly once', () => {
    assert.equal(formatTokenBudget(1847, 2000), '1,847 / 2,000 tokens')
  })

  test('handles the empty session', () => {
    assert.equal(formatTokenBudget(0, 2000), '0 / 2,000 tokens')
  })
})

describe('formatScore', () => {
  test('is an integer with no percent sign', () => {
    assert.equal(formatScore(41), '41')
    assert.equal(formatScore(100), '100')
    assert.equal(formatScore(0), '0')
  })
})

describe('formatPercent', () => {
  test('one decimal below ten percent', () => {
    assert.equal(formatPercent(0.024), '2.4%')
  })

  test('integer at and above ten percent', () => {
    assert.equal(formatPercent(0.38), '38%')
    assert.equal(formatPercent(0.1), '10%')
  })
})

describe('formatDelta', () => {
  test('uses U+2212 for negatives, not a hyphen', () => {
    assert.equal(formatDelta(-3), '\u2212' + '3')
    assert.ok(!formatDelta(-3).includes('-'))
  })

  test('signs positives explicitly', () => {
    assert.equal(formatDelta(12), '+12')
    assert.equal(formatDelta(0), '+0')
  })
})

describe('formatAbsoluteDate', () => {
  test('renders d MMM yyyy in UTC', () => {
    assert.equal(formatAbsoluteDate('2026-09-14T09:12:00.000Z'), '14 Sep 2026')
  })

  test('does not pad the day', () => {
    assert.equal(formatAbsoluteDate('2026-01-02T00:00:00.000Z'), '2 Jan 2026')
  })

  test('does not roll the date across the UTC day boundary', () => {
    assert.equal(formatAbsoluteDate('2026-12-31T23:59:00.000Z'), '31 Dec 2026')
  })
})

describe('formatDateTime', () => {
  test('renders d MMM, HH:mm in 24h UTC', () => {
    assert.equal(formatDateTime('2026-09-14T09:12:00.000Z'), '14 Sep, 09:12')
  })

  test('zero-pads the clock but not the day', () => {
    assert.equal(formatDateTime('2026-09-01T00:05:00.000Z'), '1 Sep, 00:05')
    assert.equal(formatDateTime('2026-09-01T23:00:00.000Z'), '1 Sep, 23:00')
  })
})

describe('formatRelativeTime — threshold boundaries', () => {
  test('under a minute is "just now"', () => {
    assert.equal(formatRelativeTime(ago(0), NOW), 'just now')
    assert.equal(formatRelativeTime(ago(MINUTE - 1), NOW), 'just now')
  })

  test('exactly one minute crosses into minutes', () => {
    assert.equal(formatRelativeTime(ago(MINUTE), NOW), '1m ago')
    assert.equal(formatRelativeTime(ago(12 * MINUTE), NOW), '12m ago')
    assert.equal(formatRelativeTime(ago(HOUR - 1), NOW), '59m ago')
  })

  test('exactly one hour crosses into hours', () => {
    assert.equal(formatRelativeTime(ago(HOUR), NOW), '1h ago')
    assert.equal(formatRelativeTime(ago(3 * HOUR), NOW), '3h ago')
    assert.equal(formatRelativeTime(ago(DAY - 1), NOW), '23h ago')
  })

  test('exactly one day crosses into days', () => {
    assert.equal(formatRelativeTime(ago(DAY), NOW), '1d ago')
    assert.equal(formatRelativeTime(ago(2 * DAY), NOW), '2d ago')
    assert.equal(formatRelativeTime(ago(7 * DAY - 1), NOW), '6d ago')
  })

  test('at seven days it becomes an absolute date', () => {
    // NOW is 19 Sep 2026; seven days earlier is 12 Sep 2026 — the same year, so no year.
    assert.equal(formatRelativeTime(ago(7 * DAY), NOW), '12 Sep')
  })

  test('a future timestamp clamps to "just now" rather than going negative', () => {
    assert.equal(formatRelativeTime(new Date(NOW + HOUR).toISOString(), NOW), 'just now')
  })
})

describe('formatRelativeTime — year elision', () => {
  test('omits the year within the current year', () => {
    assert.equal(formatRelativeTime('2026-01-04T00:00:00.000Z', NOW), '4 Jan')
  })

  test('adds the year for a different year', () => {
    assert.equal(formatRelativeTime('2025-12-30T00:00:00.000Z', NOW), '30 Dec 2025')
  })

  test('the comparison is against `now`, not the wall clock', () => {
    const nowIn2027 = Date.parse('2027-02-01T00:00:00.000Z')
    assert.equal(formatRelativeTime('2026-09-14T09:12:00.000Z', nowIn2027), '14 Sep 2026')
  })
})
