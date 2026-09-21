/**
 * MOCK assistant behaviour: a regex trigger table mapping user input to a canned reply
 * and the memory effects it causes. There is no extraction logic in this phase.
 *
 * ── TRIGGERS ARE EVALUATED MOST-SPECIFIC-FIRST. DO NOT REORDER. ──────────────────
 * PRD-ONE §7.6 numbers the onsite rule first and the pasted-job-description rule
 * second. That order is a bug in the spec: the scripted job description *is* an onsite
 * role being rejected, so its text contains "onsite", and first-match-wins evaluation
 * in the documented order returns a plain text reply instead of an analysis card.
 * E2E checks AB-03 (the analysis card renders) and AB-05 (token overflow, which depends
 * on the 310-token analysis reply) would both fail with no obvious cause.
 *
 * The order here is: job description → onsite → salary → fallback.
 * Recorded as a deliberate deviation from PRD-ONE §7.6.
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 * Triggers are deliberately broad (PRD-ONE §14 R4) so a reviewer typing freely still
 * lands on an intended path rather than the fallback.
 */
import type { JobAnalysis, MemoryAction, MemoryCategory } from '@/lib/schemas'

/** A memory write the reply causes. Resolved against the store by the caller. */
export type FactUpsert = {
  factId: string
  action: MemoryAction
  /** Fields used only when the fact does not exist yet and must be created. */
  seed: {
    category: MemoryCategory
    label: string
    value: string
    confidence: number
  }
}

export type ScriptedReply = {
  /** Identifies which row matched — useful in tests and logs. */
  trigger: string
  kind: 'text' | 'analysis'
  content: string
  /** MOCK: the authored token cost of the reply. */
  tokenEstimate: number
  analysis?: JobAnalysis
  factUpserts: FactUpsert[]
}

/** MOCK: the authored token cost of a pasted job description, regardless of its length. */
export const JOB_DESCRIPTION_TOKEN_ESTIMATE = 430

const NO_ONSITE_SEED: FactUpsert['seed'] = {
  category: 'dealbreaker',
  label: 'Avoids onsite roles',
  value: 'Will not accept more than one office day per month',
  confidence: 0.98,
}

const STACK_TS_SEED: FactUpsert['seed'] = {
  category: 'skill',
  label: 'TypeScript',
  value: '7 years, strict mode by default, comfortable with advanced generics',
  confidence: 0.92,
}

const COMP_FLOOR_SEED: FactUpsert['seed'] = {
  category: 'compensation',
  label: 'Compensation floor',
  value: '€95,000 base, excluding equity',
  confidence: 0.9,
}

const SCRIPTED_ANALYSIS: JobAnalysis = {
  jobTitle: 'Senior Frontend Engineer',
  company: 'Meridian Freight',
  location: 'Berlin Friedrichshain, Germany',
  workMode: 'onsite',
  compensation: '€88,000–€104,000',
  matchScore: 62,
  verdict: 'partial-match',
  criteria: [
    {
      id: 'c_sc_onsite',
      label: 'Three office days per week',
      detail: 'Your saved ceiling is one office day per month',
      weight: 'must-have',
      status: 'mismatch',
      sourceFactId: 'f_no_onsite',
    },
    {
      id: 'c_sc_role',
      label: 'Senior IC frontend role',
      detail: 'Surface ownership, no line management',
      weight: 'must-have',
      status: 'match',
      sourceFactId: 'f_role_senior_fe',
    },
    {
      id: 'c_sc_ts',
      label: 'TypeScript',
      detail: 'Strict mode named in the requirements',
      weight: 'must-have',
      status: 'match',
      sourceFactId: 'f_stack_ts',
    },
    {
      id: 'c_sc_react',
      label: 'React',
      detail: 'Primary framework for the customer surface',
      weight: 'must-have',
      status: 'match',
      sourceFactId: 'f_stack_react',
    },
    {
      id: 'c_sc_next',
      label: 'Next.js App Router',
      detail: 'Migration in progress — directly matches your experience',
      weight: 'nice-to-have',
      status: 'match',
      sourceFactId: 'f_stack_next',
    },
    {
      id: 'c_sc_location',
      label: 'Berlin-based',
      detail: 'Friedrichshain, same city',
      weight: 'nice-to-have',
      status: 'match',
      sourceFactId: 'f_loc_berlin',
    },
    {
      id: 'c_sc_comp',
      label: 'Band opens below your floor',
      detail: 'Range starts at €88,000 against a €95,000 floor; the top clears it',
      weight: 'must-have',
      status: 'partial',
      sourceFactId: 'f_comp_floor',
    },
    {
      id: 'c_sc_a11y',
      label: 'Accessibility ownership',
      detail: 'Mentioned once, no depth given',
      weight: 'nice-to-have',
      status: 'partial',
      sourceFactId: 'f_skill_a11y',
    },
    {
      id: 'c_sc_oncall',
      label: 'No paging rotation mentioned',
      weight: 'must-have',
      status: 'match',
      sourceFactId: 'f_no_oncall',
    },
  ],
  rationale:
    'The craft requirements are the closest fit you have seen — TypeScript, React and an App Router migration in progress. It is held back by the same thing as the last two: three office days a week against a saved ceiling of one a month. The band also opens below your floor, though the top of the range clears it.',
  memoryCitations: [
    {
      factId: 'f_no_onsite',
      label: 'Avoids onsite roles',
      value: 'Will not accept more than one office day per month',
    },
    {
      factId: 'f_stack_ts',
      label: 'TypeScript',
      value: '7 years, strict mode by default, comfortable with advanced generics',
    },
    {
      factId: 'f_comp_floor',
      label: 'Compensation floor',
      value: '€95,000 base, excluding equity',
    },
  ],
}

type TriggerRow = {
  trigger: string
  matches: (content: string) => boolean
  build: () => ScriptedReply
}

/**
 * Ordered most-specific-first. The first row whose `matches` returns true wins.
 */
const TRIGGER_TABLE: TriggerRow[] = [
  {
    // A pasted job description: long AND carrying job-posting vocabulary. Both
    // conditions are required — length alone catches any long message. The `s` flag
    // makes `.` match newlines so a multi-line paste still clears the length gate.
    trigger: 'job-description',
    matches: (content) =>
      /^.{400,}/s.test(content) && /(responsibilit|requirements|about the role)/i.test(content),
    build: () => ({
      trigger: 'job-description',
      kind: 'analysis',
      content: 'Evaluated Meridian Freight against your saved preferences.',
      tokenEstimate: 310,
      analysis: SCRIPTED_ANALYSIS,
      factUpserts: [
        { factId: 'f_no_onsite', action: 'reinforced', seed: NO_ONSITE_SEED },
        { factId: 'f_stack_ts', action: 'updated', seed: STACK_TS_SEED },
      ],
    }),
  },
  {
    trigger: 'onsite',
    matches: (content) => /onsite|on-site|in office|in the office/i.test(content),
    build: () => ({
      trigger: 'onsite',
      kind: 'text',
      content:
        "Understood — I've recorded that as a dealbreaker: no more than one office day a month. I'll lead every future evaluation with the working pattern rather than leaving it to the last criterion.",
      tokenEstimate: 96,
      factUpserts: [{ factId: 'f_no_onsite', action: 'created', seed: NO_ONSITE_SEED }],
    }),
  },
  {
    trigger: 'compensation',
    matches: (content) => /salary|compensation|\bcomp\b|€|\$\d/i.test(content),
    build: () => ({
      trigger: 'compensation',
      kind: 'text',
      content:
        "Saved your compensation floor. From here on, a posting that publishes no band is marked partial rather than matched — an absent band isn't evidence against a role, but it can't be checked either.",
      tokenEstimate: 94,
      factUpserts: [{ factId: 'f_comp_floor', action: 'created', seed: COMP_FLOOR_SEED }],
    }),
  },
  {
    trigger: 'fallback',
    matches: () => true,
    build: () => ({
      trigger: 'fallback',
      kind: 'text',
      content:
        "I can't evaluate that as written — this demo responds to pasted job descriptions and to statements about what you will and won't accept. Paste a full posting, or tell me a constraint (working pattern, compensation floor, stack) and I'll save it to memory.",
      tokenEstimate: 88,
      factUpserts: [],
    }),
  },
]

/** Returns the reply for a user message. Always matches — the last row is the fallback. */
export function matchScriptedReply(content: string): ScriptedReply {
  const row = TRIGGER_TABLE.find((r) => r.matches(content))
  // The fallback row matches everything, so this is unreachable — narrowed for types.
  return (row ?? TRIGGER_TABLE[TRIGGER_TABLE.length - 1]).build()
}
