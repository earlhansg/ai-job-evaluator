/**
 * Typed wrappers over the request functions in `fetcher.ts`.
 *
 * Reads are thin — SWR calls `fetcher` directly with a `keys.*` string — but the
 * mutations live here so every write has one typed home rather than being invented
 * ad hoc inside a hook. No endpoint literal appears here: every path comes from `keys`.
 */
import { fetcher, requestJson } from '@/lib/api/fetcher'
import { keys } from '@/lib/api/keys'
import type {
  DeleteFactResponse,
  MemoryFact,
  MemoryResponse,
  PatchFactRequest,
  SendMessageRequest,
  SendMessageResponse,
  SessionResponse,
  SessionsResponse,
} from '@/lib/schemas'

export function getSessions(): Promise<SessionsResponse> {
  return fetcher<SessionsResponse>(keys.sessions())
}

export function getSession(sessionId: string): Promise<SessionResponse> {
  return fetcher<SessionResponse>(keys.session(sessionId))
}

export function getMemory(): Promise<MemoryResponse> {
  return fetcher<MemoryResponse>(keys.memory())
}

export function sendMessage(sessionId: string, content: string): Promise<SendMessageResponse> {
  const body: SendMessageRequest = { content }
  return requestJson<SendMessageResponse>(keys.messages(sessionId), 'POST', body)
}

export function patchFact(factId: string, pinned: boolean): Promise<MemoryFact> {
  const body: PatchFactRequest = { pinned }
  return requestJson<MemoryFact>(keys.fact(factId), 'PATCH', body)
}

export function deleteFact(factId: string): Promise<DeleteFactResponse> {
  return requestJson<DeleteFactResponse>(keys.fact(factId), 'DELETE')
}
