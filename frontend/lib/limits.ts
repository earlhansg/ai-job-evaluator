/**
 * Input limits shared across the client/server line.
 *
 * `MESSAGE_MAX_CHARS` is enforced twice: by the zod request schema on the server
 * (`lib/schemas.ts`) and by the composer's counter in the browser. It lives here —
 * with no imports — so the composer can read it without pulling zod or the
 * server-only `lib/config.ts` into the client bundle.
 */
export const MESSAGE_MAX_CHARS = 8000
