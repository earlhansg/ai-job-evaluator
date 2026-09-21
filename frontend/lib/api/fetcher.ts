/**
 * The single throw site for the client data layer.
 *
 * SWR only populates `error` when the fetcher **throws** — `fetch` resolves happily on
 * 4xx/5xx, so a fetcher that returns the error envelope as data leaves `error`
 * undefined and renders `{ error: … }` as content. Checking `res.ok` explicitly is the
 * whole job.
 *
 * Client-side module: it must not import `lib/schemas.ts` (that would pull zod into the
 * browser bundle) or anything under `lib/store/`. The envelope shape it parses is the
 * one built by `lib/api/responses.ts`.
 */

/** The envelope every failing route handler returns. Mirrored, not imported. */
interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown }
}

/**
 * Thrown for every non-OK response. Components branch on `code` — never on `message`,
 * which is developer-facing prose and may change.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false
  const { error } = value as { error: unknown }
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  )
}

/**
 * A failed response is not guaranteed to be JSON — a proxy 502 or a framework error
 * page is HTML. Fall back to the status text rather than throwing a SyntaxError that
 * hides the real status.
 */
async function toApiError(res: Response): Promise<ApiError> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = undefined
  }

  if (isErrorEnvelope(body)) {
    return new ApiError(res.status, body.error.code, body.error.message, body.error.details)
  }
  return new ApiError(
    res.status,
    'UNEXPECTED_RESPONSE',
    res.statusText || `Request failed (${res.status})`,
  )
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw await toApiError(res)
  return (await res.json()) as T
}
