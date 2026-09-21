/**
 * Guards the trigger-ordering deviation from PRD-ONE §7.6.
 *
 * The spec numbers the onsite rule first. The scripted job description is an onsite
 * role being rejected, so under the documented order it would match "onsite" and return
 * a plain text reply instead of an analysis card — silently breaking E2E checks AB-03
 * and AB-05. This test is what stops someone "restoring" the PRD order.
 *
 * Runs under bare `node --test` because `scripted-replies.ts` imports types only.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { matchScriptedReply, JOB_DESCRIPTION_TOKEN_ESTIMATE } from './scripted-replies.ts'

/** A pasted posting for an onsite role — the exact case the ordering bug breaks. */
const ONSITE_JOB_DESCRIPTION = [
  'Senior Frontend Engineer — Meridian Freight, Berlin Friedrichshain.',
  '',
  'About the role: you will own the customer-facing shipment tracking surface, working',
  'with a designer and three backend engineers. We are mid-migration to the Next.js App',
  'Router and you would lead the frontend half of it.',
  '',
  'Requirements: 5+ years of React, TypeScript in strict mode, an eye for interface',
  'detail, and experience owning a surface end to end. Accessibility awareness is a plus.',
  '',
  'Responsibilities: shape the roadmap with product, ship weekly, mentor one mid-level',
  'engineer, and keep the design system honest.',
  '',
  'Working pattern: three days onsite in Friedrichshain, two days remote.',
  'Band: €88,000–€104,000 depending on experience.',
].join('\n')

describe('matchScriptedReply', () => {
  test('a pasted job description containing "onsite" returns an ANALYSIS, not a text reply', () => {
    assert.ok(ONSITE_JOB_DESCRIPTION.length >= 400, 'precondition: clears the length gate')
    assert.match(ONSITE_JOB_DESCRIPTION, /onsite/i, 'precondition: contains the onsite keyword')

    const reply = matchScriptedReply(ONSITE_JOB_DESCRIPTION)

    assert.equal(reply.trigger, 'job-description')
    assert.equal(reply.kind, 'analysis')
    assert.ok(reply.analysis, 'the analysis payload is populated')
  })

  test('the analysis reply costs the authored 310 tokens the demo ledger assumes', () => {
    const reply = matchScriptedReply(ONSITE_JOB_DESCRIPTION)
    assert.equal(reply.tokenEstimate, 310)
    assert.equal(JOB_DESCRIPTION_TOKEN_ESTIMATE, 430)
  })

  test('the job-description trigger needs BOTH length and posting vocabulary', () => {
    const longButNotAPosting = 'x'.repeat(900)
    assert.notEqual(matchScriptedReply(longButNotAPosting).trigger, 'job-description')

    const postingVocabButShort = 'About the role: frontend.'
    assert.notEqual(matchScriptedReply(postingVocabButShort).trigger, 'job-description')
  })

  test('the length gate counts across newlines (the `s` flag)', () => {
    const multiline = Array.from({ length: 40 }, (_, i) => `line ${i} about the role`).join('\n')
    assert.ok(multiline.length >= 400)
    assert.equal(matchScriptedReply(multiline).trigger, 'job-description')
  })

  test('a short onsite statement matches the onsite trigger and creates the dealbreaker', () => {
    const reply = matchScriptedReply("I can't do onsite.")

    assert.equal(reply.trigger, 'onsite')
    assert.equal(reply.kind, 'text')
    assert.deepEqual(
      reply.factUpserts.map((u) => u.factId),
      ['f_no_onsite'],
    )
  })

  test('a compensation statement matches the compensation trigger', () => {
    for (const input of [
      'My salary floor is 95k.',
      'What about compensation?',
      'I need at least €95,000.',
      'Anything under $90000 is out.',
    ]) {
      assert.equal(matchScriptedReply(input).trigger, 'compensation', input)
    }
  })

  test('anything else falls back, with no memory effects', () => {
    const reply = matchScriptedReply('hello')

    assert.equal(reply.trigger, 'fallback')
    assert.equal(reply.kind, 'text')
    assert.deepEqual(reply.factUpserts, [])
  })

  test('the job-description row declares the two memory effects AB-04 expects', () => {
    const reply = matchScriptedReply(ONSITE_JOB_DESCRIPTION)

    assert.deepEqual(
      reply.factUpserts.map((u) => [u.factId, u.action]),
      [
        ['f_no_onsite', 'reinforced'],
        ['f_stack_ts', 'updated'],
      ],
    )
  })
})
