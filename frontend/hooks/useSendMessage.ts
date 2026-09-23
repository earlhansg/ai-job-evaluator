'use client'

/**
 * The send mutation. One POST updates all three panels.
 *
 * It mutates the **session** key, not `keys.messages`: nothing reads the messages key,
 * so optimistic data and `populateCache` there would update an unrendered cache entry.
 * The POST itself still goes to `keys.messages()` inside `client.ts`.
 *
 *  - Panel 2: the optimistic bubble on trigger; on success the committed data plus the
 *    two server messages and the new session memory (`withSendResult`).
 *  - Panel 3: seeded from the response's full `longTermMemory` array, then revalidated
 *    as a backstop.
 *  - Panel 1: `/api/sessions` revalidates for the new order and recency.
 *
 * The cross-panel mutates are fired, not awaited, so the panels update together
 * (components.md §6). On failure SWR rolls the optimistic bubble back and the error
 * propagates to the composer, which restores the draft.
 */
import { useSWRConfig } from 'swr'
import useSWRMutation from 'swr/mutation'
import { useToast } from '@/hooks/useToast'
import { useMemoryActivity } from '@/hooks/useMemoryActivity'
import { sendMessage } from '@/lib/api/client'
import {
  buildOptimisticUserMessage,
  memoryFromFacts,
  withOptimisticMessage,
  withSendResult,
} from '@/lib/api/cache-updates'
import type { ApiError } from '@/lib/api/fetcher'
import { keys } from '@/lib/api/keys'
import type { SendMessageResponse, SessionResponse } from '@/lib/schemas'

/** Module-level so optimistic ids stay unique across remounts. Only bumped in `send`. */
let optimisticSeq = 0

export function useSendMessage(sessionId: string): {
  send: (content: string) => Promise<void>
  isSending: boolean
} {
  const { mutate } = useSWRConfig()
  const toast = useToast()
  const { recordEffects } = useMemoryActivity()

  const { trigger, isMutating } = useSWRMutation<
    SendMessageResponse,
    ApiError,
    string,
    string,
    SessionResponse | undefined
  >(keys.session(sessionId), (_key, { arg }) => sendMessage(sessionId, arg), {
    populateCache: (res, committed) => withSendResult(committed, res),
    revalidate: false,
    rollbackOnError: true,
    throwOnError: true,
    onSuccess: (res) => {
      void mutate(keys.memory(), memoryFromFacts(res.longTermMemory), { revalidate: true })
      void mutate(keys.sessions())
      recordEffects(res.memoryEffects)
      for (const effect of res.memoryEffects) toast.memory(effect.label)
    },
  })

  async function send(content: string): Promise<void> {
    optimisticSeq += 1
    const optimistic = buildOptimisticUserMessage(
      sessionId,
      content,
      new Date().toISOString(),
      optimisticSeq,
    )
    // `trigger`'s own `SWRData` generic defaults to the *response* type; the optimistic
    // data is the session cache's shape, so it is named explicitly.
    await trigger<SessionResponse | undefined>(content, {
      optimisticData: (current) => withOptimisticMessage(current, optimistic),
    })
  }

  return { send, isSending: isMutating }
}
