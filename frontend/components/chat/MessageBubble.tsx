import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/format'
import type { MessageRole } from '@/lib/schemas'

const ROLE_ALIGNMENT = {
  user: 'self-end',
  assistant: 'self-start',
} as const satisfies Record<MessageRole, string>

/** PRD §7.3: the bubble is `surface-2` and borderless for both roles. The rail, not the
 *  surface, is what separates user from assistant. */
const ROLE_SURFACE = {
  user: 'bg-surface-2 text-text',
  assistant: 'bg-surface-2 text-text',
} as const satisfies Record<MessageRole, string>

const ROLE_LABEL = {
  user: 'You',
  assistant: 'Assistant',
} as const satisfies Record<MessageRole, string>

interface MessageBubbleProps {
  role: MessageRole
  content: string
  createdAt: string
  className?: string
}

/**
 * The conversational surface — the one place `rounded-2xl` is used, and the rail the
 * `AnalysisCard` deliberately breaks.
 *
 * `max-w-[min(72ch,90%)]` is what makes AB-03's width comparison meaningful. 72ch alone
 * is not enough: in an 820px Panel 2 it measures 764px against the card's 788px, and at
 * 1280px the two are identical — "rail-aligned" means a visible gutter, so the rail is
 * capped at 90% of the column as well as at the specified 72ch.
 *
 * Content renders as a plain text node — never as raw HTML — so a pasted job
 * description cannot inject markup (PRD §9). The Validation grep that enforces this
 * scans for the React escape hatch by name, so it is deliberately not spelled out here.
 */
export function MessageBubble({ role, content, createdAt, className }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'flex w-fit max-w-[min(72ch,90%)] min-w-0 flex-col gap-1 rounded-2xl px-4 py-3',
        ROLE_ALIGNMENT[role],
        ROLE_SURFACE[role],
        className,
      )}
    >
      <span className="text-eyebrow text-muted font-mono tracking-[0.08em] uppercase">
        {ROLE_LABEL[role]}
      </span>
      <p className="text-body break-words whitespace-pre-wrap">{content}</p>
      <span className="text-caption text-muted tabular-nums">{formatDateTime(createdAt)}</span>
    </div>
  )
}
