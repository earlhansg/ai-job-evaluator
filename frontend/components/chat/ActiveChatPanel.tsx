'use client'

import { useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { PanelShell } from '@/components/layout/PanelShell'
import { PanelError } from '@/components/ui/PanelError'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { Composer } from '@/components/chat/Composer'
import { MessageList } from '@/components/chat/MessageList'
import { MessageListSkeleton } from '@/components/chat/MessageListSkeleton'
import { useSendMessage } from '@/hooks/useSendMessage'
import { useSession } from '@/hooks/useSession'
import { cn } from '@/lib/utils/cn'

interface ActiveChatPanelProps {
  sessionId: string
  className?: string
}

/**
 * Panel 2. `main` landmark, four render states, and the only scroll-anchored column.
 *
 * The scroll container lives in `PanelShell`, so the ref is created here and handed to
 * both — `MessageList` needs the real scrolling element to decide whether the reader
 * is near the bottom.
 *
 * The composer sits in the shell's fixed footer, so it is present in the empty state
 * too. `key={sessionId}` resets its draft and error on a session switch — without it,
 * React keeps the same component instance across the param change.
 */
export function ActiveChatPanel({ sessionId, className }: ActiveChatPanelProps) {
  const { data, error, isLoading, mutate } = useSession(sessionId)
  const { send, isSending } = useSendMessage(sessionId)
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <PanelShell
      landmark="main"
      aria-label="Active chat"
      title="Active chat"
      action={
        data ? (
          <ChatHeader
            title={data.session.title}
            sessionMemory={data.sessionMemory}
            className="flex-1 basis-80"
          />
        ) : null
      }
      footer={data ? <Composer key={sessionId} onSend={send} isSending={isSending} /> : null}
      contentRef={scrollRef}
      className={cn('border-border', className)}
    >
      {error ? (
        <PanelError message={panelErrorMessage(error.code)} onRetry={() => void mutate()} />
      ) : isLoading || !data ? (
        <MessageListSkeleton />
      ) : data.sessionMemory.verbatimMessageIds.length === 0 &&
        data.sessionMemory.summaries.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <EmptyTranscript />
        </div>
      ) : (
        <MessageList
          sessionId={sessionId}
          messages={data.messages}
          sessionMemory={data.sessionMemory}
          scrollRef={scrollRef}
          isSending={isSending}
        />
      )}
    </PanelShell>
  )
}

/** Co-located: under 20 lines, used nowhere else. */
function EmptyTranscript() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <MessageSquare size={24} strokeWidth={1.5} className="text-muted" aria-hidden="true" />
      <p className="text-title text-text font-medium">No messages yet</p>
      <p className="text-caption text-muted max-w-64">
        Paste a job description to get a structured match analysis.
      </p>
    </div>
  )
}

function panelErrorMessage(code: string): string {
  if (code === 'SESSION_NOT_FOUND') return 'That session does not exist.'
  return 'Could not load this conversation.'
}
