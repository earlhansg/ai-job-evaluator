/**
 * The composer's suggestion chips.
 *
 * This is UI copy (what a user might type), not mock behaviour. It lives outside
 * `lib/mock/` so components may import it without breaking invariant 1. Each text is
 * guarded by `lib/mock/scripted-replies.test.ts`, which asserts that it lands on the
 * trigger its chip promises. The sample job description in particular must clear both
 * halves of the job-description gate: ≥400 characters **and** posting vocabulary.
 *
 * No imports, so the test can load it under bare `node --test`.
 */
export interface ComposerSuggestion {
  id: 'sample-jd' | 'onsite' | 'comp-floor'
  label: string
  text: string
}

const SAMPLE_JOB_DESCRIPTION = [
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

export const COMPOSER_SUGGESTIONS: readonly ComposerSuggestion[] = [
  { id: 'sample-jd', label: 'Paste a sample job description', text: SAMPLE_JOB_DESCRIPTION },
  {
    id: 'onsite',
    label: 'I avoid onsite roles',
    text: "I won't take onsite roles — one office day a month at most.",
  },
  { id: 'comp-floor', label: 'Set a salary floor', text: 'My compensation floor is €95,000 base.' },
]
