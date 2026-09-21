'use client'

import { useMemo } from 'react'
import { MessageSquare } from 'lucide-react'
import { PanelShell } from '@/components/layout/PanelShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { PanelError } from '@/components/ui/PanelError'
import { SessionGroupHeader } from '@/components/history/SessionGroupHeader'
import { SessionListItem } from '@/components/history/SessionListItem'
import { SessionListSkeleton } from '@/components/history/SessionListSkeleton'
import { NewSessionButton } from '@/components/history/NewSessionButton'
import { useSessions } from '@/hooks/useSessions'
import { cn } from '@/lib/utils/cn'
import type { ChatSessionSummary } from '@/lib/schemas'

const DAY_MS = 24 * 60 * 60 * 1000

/** Fixed order; a group with no sessions is skipped entirely, header included. */
const GROUP_ORDER = ['Today', 'This week', 'Earlier'] as const
type GroupLabel = (typeof GROUP_ORDER)[number]

interface ChatHistoryPanelProps {
  className?: string
}

/**
 * Panel 1. `navigation` landmark, four render states.
 *
 * Sessions arrive pre-sorted `updatedAt` desc from the store — this component groups
 * them but never re-sorts. Grouping is relative to *now* against absolute fixture
 * dates, so the distribution drifts over real time; only non-empty groups render, and
 * Phase 4 must not assert on group names.
 */
export function ChatHistoryPanel({ className }: ChatHistoryPanelProps) {
  const { data, error, isLoading, mutate } = useSessions()

  const sessions = data?.sessions
  const groups = useMemo(() => groupByRecency(sessions ?? []), [sessions])
  const maxTokens = useMemo(
    () => (sessions ?? []).reduce((max, s) => Math.max(max, s.tokensUsed), 0),
    [sessions],
  )

  return (
    <PanelShell
      landmark="navigation"
      aria-label="Chat history"
      title="Chat history"
      action={<NewSessionButton />}
      className={cn('border-border', className)}
      contentClassName="p-2"
    >
      {error ? (
        <PanelError message={panelErrorMessage(error.code)} onRetry={() => void mutate()} />
      ) : isLoading || !sessions ? (
        <SessionListSkeleton />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No sessions yet"
          description="Evaluations you start will be listed here, newest first."
        />
      ) : (
        <div className="flex flex-col gap-1">
          {GROUP_ORDER.filter((label) => groups[label].length > 0).map((label) => (
            <section key={label} className="flex flex-col gap-1">
              <SessionGroupHeader label={label} />
              {groups[label].map((session) => (
                <SessionListItem key={session.id} session={session} maxTokens={maxTokens} />
              ))}
            </section>
          ))}
        </div>
      )}
    </PanelShell>
  )
}

function groupByRecency(
  sessions: ChatSessionSummary[],
  now: number = Date.now(),
): Record<GroupLabel, ChatSessionSummary[]> {
  const buckets: Record<GroupLabel, ChatSessionSummary[]> = {
    Today: [],
    'This week': [],
    Earlier: [],
  }
  const startOfToday = Date.parse(new Date(now).toISOString().slice(0, 10))

  for (const session of sessions) {
    const at = Date.parse(session.updatedAt)
    if (at >= startOfToday) buckets.Today.push(session)
    else if (now - at < 7 * DAY_MS) buckets['This week'].push(session)
    else buckets.Earlier.push(session)
  }
  return buckets
}

/** Branch on `code`, never on `message` — the message is developer-facing prose. */
function panelErrorMessage(code: string): string {
  return code === 'INTERNAL_ERROR'
    ? 'The session list is unavailable right now.'
    : 'Could not load your sessions.'
}
