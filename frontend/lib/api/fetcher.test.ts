/**
 * `requestJson` — the write-side half of the single throw site.
 *
 * `fetch` is stubbed per test; `fetcher.ts` has no imports, so it loads under bare
 * `node --test`.
 */
import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, requestJson } from './fetcher.ts'

const realFetch = globalThis.fetch

interface Call {
  url: string
  init: RequestInit
}

function stubFetch(response: Response): Call[] {
  const calls: Call[] = []
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return response
  }) as typeof fetch
  return calls
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('requestJson', () => {
  test('returns the JSON body of a 2xx response', async () => {
    stubFetch(json(201, { ok: true, id: 'm_1' }))
    const result = await requestJson<{ ok: boolean; id: string }>('/x', 'POST', { content: 'hi' })
    assert.deepEqual(result, { ok: true, id: 'm_1' })
  })

  test('an error envelope becomes an ApiError with status, code and details', async () => {
    const details = { issues: [{ path: ['content'] }] }
    stubFetch(json(422, { error: { code: 'INVALID_BODY', message: 'Too long', details } }))

    await assert.rejects(requestJson('/x', 'POST', { content: '' }), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 422)
      assert.equal(error.code, 'INVALID_BODY')
      assert.deepEqual(error.details, details)
      return true
    })
  })

  test('a non-JSON failure becomes UNEXPECTED_RESPONSE, not a SyntaxError', async () => {
    stubFetch(new Response('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' }))

    await assert.rejects(requestJson('/x', 'PATCH', { pinned: true }), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 502)
      assert.equal(error.code, 'UNEXPECTED_RESPONSE')
      return true
    })
  })

  test('sends the method, a JSON content-type and the stringified body', async () => {
    const calls = stubFetch(json(200, {}))
    await requestJson('/api/memory/f_1', 'PATCH', { pinned: true })

    assert.equal(calls.length, 1)
    const { url, init } = calls[0]
    const headers = init.headers as Record<string, string>
    assert.equal(url, '/api/memory/f_1')
    assert.equal(init.method, 'PATCH')
    assert.equal(headers['content-type'], 'application/json')
    assert.equal(headers.accept, 'application/json')
    assert.equal(init.body, '{"pinned":true}')
  })

  test('a bodyless DELETE sends no content-type and no body', async () => {
    const calls = stubFetch(json(200, { ok: true, factId: 'f_1' }))
    await requestJson('/api/memory/f_1', 'DELETE')

    const headers = calls[0].init.headers as Record<string, string>
    assert.equal(calls[0].init.method, 'DELETE')
    assert.equal(headers['content-type'], undefined)
    assert.equal(calls[0].init.body, undefined)
  })
})
