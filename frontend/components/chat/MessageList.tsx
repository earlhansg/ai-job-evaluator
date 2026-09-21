'use client'

import { useEffect } from 'react'
import { AnalysisCard } from '@/components/analysis/AnalysisCard'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { SummarizedContextEntry } from '@/components/chat/SummarizedContextEntry'
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
 */
export function MessageList({
  sessionId,
  messages,
  sessionMemory,
  scrollRef,
  className,
}: MessageListProps) {
  const verbatim = new Set(sessionMemory.verbatimMessageIds)
  const visible = messages.filter((message) => verbatim.has(message.id))

  // Opening a session lands at the newest message.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [sessionId, scrollRef])

  // A later append follows the reader only if they had not scrolled away.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX) {
      el.scrollTop = el.scrollHeight
    }
  }, [visible.length, scrollRef])

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

      {visible.map((message) =>
        // Narrow on the discriminant, so TypeScript proves `analysis` exists.
        message.kind === 'analysis' ? (
          <AnalysisCard key={message.id} analysis={message.analysis} />
        ) : (
          <MessageBubble
            key={message.id}
            role={message.role}
            content={message.content}
            createdAt={message.createdAt}
          />
        ),
      )}
    </div>
  )
}
