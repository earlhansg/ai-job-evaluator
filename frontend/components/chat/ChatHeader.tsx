'use client'

import { PanelLeft, PanelRight } from 'lucide-react'
import { SessionMemoryMeter } from '@/components/chat/SessionMemoryMeter'
import { useWorkspaceDrawers } from '@/hooks/useWorkspaceDrawers'
import { cn } from '@/lib/utils/cn'
import type { SessionMemoryState } from '@/lib/schemas'

const TOGGLE_STYLES = cn(
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border',
  'bg-surface-1 text-muted transition-colors duration-fast hover:text-accent xl:hidden',
)

interface ChatHeaderProps {
  title: string
  sessionMemory: SessionMemoryState
  className?: string
}

/**
 * Panel 2's own header: the session title, the token meter, and — below 1280px, where
 * Panels 1 and 3 are drawers — the two icon-only toggles that open them.
 *
 * The row wraps and the meter goes full width below `sm`. Without that, at 375px the
 * two toggles and a 256px meter consume the whole row and the `flex-1` title shrinks to
 * zero — `chat-title` is still in the DOM but invisible, which is worse than either
 * wrapping or truncating.
 */
export function ChatHeader({ title, sessionMemory, className }: ChatHeaderProps) {
  const { openHistory, openMemory } = useWorkspaceDrawers()

  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-3', className)}>
      <button
        type="button"
        onClick={openHistory}
        aria-label="Open chat history"
        className={TOGGLE_STYLES}
      >
        <PanelLeft size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <h1
        data-testid="chat-title"
        className="text-title text-text min-w-0 flex-1 truncate font-medium"
      >
        {title}
      </h1>

      <SessionMemoryMeter sessionMemory={sessionMemory} className="w-full shrink-0 sm:w-64" />

      <button
        type="button"
        onClick={openMemory}
        aria-label="Open long-term memory"
        className={TOGGLE_STYLES}
      >
        <PanelRight size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  )
}
