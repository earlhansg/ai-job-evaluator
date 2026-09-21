/**
 * The only two ways a route handler is allowed to build a response.
 *
 * Centralizing this is the single thing that guarantees the required headers are never
 * forgotten on a new endpoint — including on errors, which `api.md` §12 requires.
 * Never call `Response.json` directly in a handler.
 */
import { getStoreKind } from '@/lib/store/index'

/**
 * `x-data-source` proves the seam: it reads `mock` today and flips to `redis` after the
 * swap with no handler edit. E2E check AB-06 asserts it.
 */
function baseHeaders(latencyMs?: number): Record<string, string> {
  return {
    'x-data-source': getStoreKind(),
    'x-store-latency-ms': String(latencyMs ?? 0),
  }
}

export function jsonResponse<T>(data: T, init?: { status?: number; latencyMs?: number }): Response {
  return Response.json(data, {
    status: init?.status ?? 200,
    headers: baseHeaders(init?.latencyMs),
  })
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return Response.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status, headers: baseHeaders() },
  )
}

/** Structured 422 for a zod failure. `code` is the contract; `message` is for developers. */
export function invalidBodyResponse(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): Response {
  return errorResponse(422, 'INVALID_BODY', 'Request body failed validation', {
    issues: issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  })
}

/**
 * Wraps a handler so an unexpected fault still returns the project's error envelope
 * with both required headers, instead of Next's framework 500.
 *
 * The exception text never reaches the client — it is logged server-side and the
 * response carries a generic `INTERNAL_ERROR` (`api.md` §8). The realistic trigger
 * today is `AJE_STORE=redis`, where every store method throws `NOT_IMPLEMENTED`: the
 * failure must stay loud, but it should still be a well-formed API error.
 *
 * A malformed `AJE_STORE` value is deliberately *not* caught — `getStoreKind()` throws
 * while building the headers, so the process fails hard rather than emitting a response
 * whose `x-data-source` cannot be trusted.
 */
export function route<C>(
  handler: (req: Request, ctx: C) => Promise<Response>,
): (req: Request, ctx: C) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (error) {
      console.error('[api] unhandled route error', error)
      return errorResponse(500, 'INTERNAL_ERROR', 'Unexpected server error')
    }
  }
}
