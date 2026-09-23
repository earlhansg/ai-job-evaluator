'use client'

import { Fragment, useEffect, useRef } from 'react'
import { AnalysisCard } from '@/components/analysis/AnalysisCard'
import { MemorySavedBadge } from '@/components/chat/MemorySavedBadge'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { SummarizedContextEntry } from '@/components/chat/SummarizedContextEntry'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { cn } from '@/lib/utils/cn'
import type { ChatMessage, SessionMemoryState } from '@/lib/schemas'

/** Pin to the bottom only when the reader is already within this many px of it. */
const NEAR_BOTTOM_PX = 120

interface MessageListProps {
  sessionId: string
  messages: ChatMessage[]
  sessionMemory: SessionMemoryState
  /** The panel's scroll container, owned by `ActiveChatPanel`. */
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** A send is in flight — renders the typing indicator after the last message. */
  isSending: boolean
  className?: string
}

/**
 * The transcript.
 *
 * `role="log"` (implicitly `aria-live="polite"`) is the correct role for entries
 * appended to the end. No additional live region is nested inside it — overlapping
 * live regions produce duplicate or dropped announcements.
 *
 * Only `sessionMemory.verbatimMessageIds` is rendered. After compaction the overflowed
 * messages must **not** appear verbatim; the summary row stands in for them, and it
 * precedes the oldest surviving message in DOM order.
 *
 * A message with `memoryEffects` is followed by one `MemorySavedBadge` per effect. The
 * badges persist; the toasts announcing the same effects do not.
 */
export function MessageList({
  sessionId,
  messages,
  sessionMemory,
  scrollRef,
  isSending,
  className,
}: MessageListProps) {
  const verbatim = new Set(sessionMemory.verbatimMessageIds)
  const visible = messages.filter((message) => verbatim.has(message.id))

  // Whether the reader was near the bottom *before* the latest commit. Measuring inside
  // the append effect is too late: compaction removes messages from the top in the same
  // commit that appends the reply, so the post-commit geometry no longer says where the
  // reader was. Scroll events keep this current; content changes alone do not.
  const pinnedToBottom = useRef(true)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollRef])

  // Opening a session lands at the newest message.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    pinnedToBottom.current = true
  }, [sessionId, scrollRef])

  // A later append — or the typing indicator appearing — follows the reader only if
  // they had not scrolled away. Compaction can *shrink* `visible.length`; that is still
  // a change, so the effect still fires.
  useEffect(() => {
    const el = scrollRef.current
    if (el && pinnedToBottom.current) el.scrollTop = el.scrollHeight
  }, [visible.length, isSending, scrollRef])

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Conversation"
      className={cn('flex min-w-0 flex-col gap-4', className)}
    >
      {sessionMemory.summaries.map((summary) => (
        <SummarizedContextEntry key={summary.id} summary={summary} />
      ))}

      {visible.map((message) => (
        <Fragment key={message.id}>
          {/* Narrow on the discriminant, so TypeScript proves `analysis` exists. */}
          {message.kind === 'analysis' ? (
            <AnalysisCard analysis={message.analysis} />
          ) : (
            <MessageBubble
              role={message.role}
              content={message.content}
              createdAt={message.createdAt}
            />
          )}

          {message.memoryEffects?.length ? (
            <div className="flex flex-wrap gap-2 self-start">
              {message.memoryEffects.map((effect) => (
                <MemorySavedBadge key={effect.factId} factId={effect.factId} label={effect.label} />
              ))}
            </div>
          ) : null}
        </Fragment>
      ))}

      {isSending ? <TypingIndicator /> : null}
    </div>
  )
}
