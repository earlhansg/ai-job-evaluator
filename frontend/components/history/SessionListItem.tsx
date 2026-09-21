'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { formatCount, formatRelativeTime } from '@/lib/utils/format'
import type { ChatSessionSummary } from '@/lib/schemas'

interface SessionListItemProps {
  session: ChatSessionSummary
  /** Largest `tokensUsed` in the list — the sparkbar compares sessions, not budgets. */
  maxTokens: number
  className?: string
}

/**
 * One row in Panel 1.
 *
 * The active state reads from `usePathname()`, never from a prop drilled out of a
 * parent's `useState` — the URL is the selection. `aria-current` is *absent* on
 * inactive rows rather than `"false"`, because AB-02 asserts the previous row loses
 * the attribute.
 *
 * `aria-label` is pinned to the session title so the accessible name stays stable as
 * the relative timestamp ticks over.
 */
export function SessionListItem({ session, maxTokens, className }: SessionListItemProps) {
  const pathname = usePathname()
  const href = `/c/${session.id}`
  const isActive = pathname === href

  const sparkPct = maxTokens > 0 ? Math.round((session.tokensUsed / maxTokens) * 100) : 0

  return (
    <Link
      href={href}
      aria-label={session.title}
      aria-current={isActive ? 'page' : undefined}
      data-testid="session-item"
      className={cn(
        'duration-fast flex min-h-18 flex-col gap-1 rounded-xl border-l-2 px-3 py-3 transition-colors',
        isActive
          ? 'border-accent bg-surface-2'
          : 'hover:border-track hover:bg-surface-1 border-transparent',
        className,
      )}
    >
      <span className="text-title text-text truncate font-medium">{session.title}</span>

      <span className="text-caption text-muted flex items-center gap-2">
        <span className="tabular-nums">{formatRelativeTime(session.updatedAt)}</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums">
          {formatCount(session.evaluationCount)}{' '}
          {session.evaluationCount === 1 ? 'evaluation' : 'evaluations'}
        </span>
      </span>

      <span className="text-eyebrow text-muted font-mono tracking-[0.08em] uppercase tabular-nums">
        {formatCount(session.tokensUsed)} tokens
      </span>

      {/* Decorative: this session's token weight relative to the heaviest one. The
          number it describes is rendered directly above. */}
      <svg
        viewBox="0 0 100 2"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="h-0.5 w-full overflow-hidden rounded-full"
      >
        <rect x="0" y="0" width="100" height="2" className="fill-track" />
        <rect x="0" y="0" width={sparkPct} height="2" className="fill-accent" />
      </svg>
    </Link>
  )
}
