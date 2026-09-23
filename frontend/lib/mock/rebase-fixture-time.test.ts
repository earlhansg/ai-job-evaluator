/**
 * Fixture rebasing. Fixtures are read with `node:fs` (as in `fixture-tuning.test.ts`),
 * so this file needs no path alias or JSON import attributes.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  ANCHOR_AGE_MS,
  FIXTURE_ANCHOR,
  rebaseOffset,
  shiftTimestamps,
} from './rebase-fixture-time.ts'

function readFixture<T>(name: string): T {
  const path = fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

const HOUR = 60 * 60 * 1000

describe('rebase-fixture-time', () => {
  test('the anchor is the newest session updatedAt in the fixtures', () => {
    const sessions = readFixture<Array<{ updatedAt: string }>>('sessions.json')
    const newest = sessions
      .map((s) => s.updatedAt)
      .sort()
      .at(-1)
    assert.equal(
      FIXTURE_ANCHOR,
      newest,
      'a newer fixture was added — move FIXTURE_ANCHOR to it or it will render in the future',
    )
  })

  test('the offset lands the anchor ANCHOR_AGE_MS before now', () => {
    const now = Date.parse('2027-01-01T12:00:00.000Z')
    const shifted = shiftTimestamps({ updatedAt: FIXTURE_ANCHOR }, rebaseOffset(now))
    assert.equal(Date.parse(shifted.updatedAt), now - ANCHOR_AGE_MS)
  })

  test('pairwise differences are preserved', () => {
    const input = [
      { createdAt: '2026-09-12T14:02:00.000Z', updatedAt: '2026-09-19T08:40:00.000Z' },
      { createdAt: '2026-09-16T11:20:00.000Z', updatedAt: '2026-09-18T16:05:00.000Z' },
    ]
    const out = shiftTimestamps(input, 5 * HOUR + 17)

    const stamps = (rows: typeof input) =>
      rows.flatMap((r) => [Date.parse(r.createdAt), Date.parse(r.updatedAt)])
    const before = stamps(input)
    const after = stamps(out)
    for (let i = 1; i < before.length; i++) {
      assert.equal(after[i] - after[0], before[i] - before[0])
    }
  })

  test('non-timestamp fields are untouched, and nested objects and arrays are handled', () => {
    const input = {
      id: 'f_1',
      tokenEstimate: 310,
      source: { sessionId: 's_1', messageId: 'm_1' },
      nested: [{ createdAt: '2026-09-19T08:00:00.000Z', tags: ['a', 'b'] }],
    }
    const out = shiftTimestamps(input, HOUR)

    assert.equal(out.id, 'f_1')
    assert.equal(out.tokenEstimate, 310)
    assert.deepEqual(out.source, { sessionId: 's_1', messageId: 'm_1' })
    assert.deepEqual(out.nested[0].tags, ['a', 'b'])
    assert.equal(out.nested[0].createdAt, '2026-09-19T09:00:00.000Z')
  })

  test('output strings are canonical ISO (z.iso.datetime-safe)', () => {
    const out = shiftTimestamps({ createdAt: '2026-09-19T08:00:00.000Z' }, 123)
    assert.match(out.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  test('the input is not mutated', () => {
    const input = { createdAt: '2026-09-19T08:00:00.000Z', list: [{ updatedAt: FIXTURE_ANCHOR }] }
    const snapshot = structuredClone(input)
    shiftTimestamps(input, HOUR)
    assert.deepEqual(input, snapshot)
  })
})
