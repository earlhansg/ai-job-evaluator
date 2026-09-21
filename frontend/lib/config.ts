/**
 * Project-wide constants.
 *
 * The token budget numbers are demo values chosen so the seeded session overflows
 * on the first scripted job description — not production recommendations.
 */

/** The single hardcoded user. All storage is namespaced by this so auth is additive later. */
export const USER_ID = 'u_demo'

/** Verbatim token budget for a session's context window. */
export const SESSION_TOKEN_BUDGET = 2000

/**
 * Headroom reserved for the next reply.
 *
 * DEVIATION FROM PRD-ONE §9, which specifies 256. With 256 the effective budget is
 * 2000 - 256 = 1744, which puts the seeded `s_onsite_rejects` session (1,847 verbatim
 * tokens) over budget *at load* — rendering a summary on first paint, breaking E2E
 * check AB-01 and destroying AB-05's baseline. With 128 the effective budget is 1872,
 * the seed fits with 25 tokens of headroom, and the scripted JD still pushes it over.
 * The reserve is the only one of the three coupled numbers with no downstream reference.
 */
export const RESERVE_TOKENS = 128

/** Assumed token cost of one summary block. */
export const SUMMARY_TOKEN_COST = 60

/** Simulated store latency. Applied inside the store only — never in a handler. */
export const LATENCY_MS = Number(process.env.AJE_LATENCY_MS ?? 650)

/** Seed identifier reported by POST /api/dev/reset. */
export const SEED_ID = 'demo-v1'

/**
 * `process.env.NODE_ENV` is narrowed by Next's generated types while `next dev` is
 * running, so comparing it to `'production'` inline is reported as a no-overlap error.
 * Read it once, here, as a plain string.
 */
export const IS_PRODUCTION = (process.env.NODE_ENV as string) === 'production'

/** Validate outbound payloads outside production — cheap insurance that the mock and
 *  the future Redis store produce identical shapes (`api.md` §5 rule 4). */
export const VALIDATE_OUTBOUND = !IS_PRODUCTION
