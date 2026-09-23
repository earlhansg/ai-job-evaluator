'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Drawer } from '@/components/layout/Drawer'
import { ChatHistoryPanel } from '@/components/history/ChatHistoryPanel'
import { LongTermMemoryPanel } from '@/components/memory/LongTermMemoryPanel'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  MemoryActivityContext,
  type FactHighlight,
  type MemoryActivity,
  type RecentMemoryAction,
} from '@/hooks/useMemoryActivity'
import { WorkspaceDrawersContext } from '@/hooks/useWorkspaceDrawers'
import type { MemoryEffect } from '@/lib/schemas'

/** The `xl` breakpoint, in `matchMedia` terms. Keep in step with the grid below. */
const DESKTOP_QUERY = '(min-width: 1280px)'

/** How long a "show this fact" request keeps the fact highlighted (PRD §7.4). */
const HIGHLIGHT_MS = 2000

interface WorkspaceChromeProps {
  /** Panel 2 — the route's page, passed through from a Server Component. */
  children: React.ReactNode
}

/**
 * The workspace grid and the two side panels.
 *
 * This is the client half of `app/(workspace)/layout.tsx`, split out because the
 * drawer state needs `useState` and the root layout must stay a Server Component.
 * `children` is still server-rendered — it is passed *through* this component, not
 * imported by it.
 *
 * Crossing 1280px swaps `<aside>` for `<dialog>` and therefore remounts the panel.
 * That is the accepted trade: SWR serves the cached data (no refetch, no skeleton),
 * and the alternative — always rendering `<dialog open>` and neutralising it with CSS
 * — exposes `aria-modal="false"` and has no focus trap.
 *
 * `minmax(0,1fr)` on the middle column, never a bare `1fr`: `1fr` carries
 * `min-width: auto`, and the 251-character criterion label in `m_pe_002` would blow
 * the grid out horizontally.
 *
 * It also provides `MemoryActivityContext`: `showFact` needs the memory drawer's
 * opener, and this is the component that owns it. `recent` is deliberately not
 * cleared on a session switch — the chips describe what changed in memory during this
 * visit, and memory is cross-session.
 */
export function WorkspaceChrome({ children }: WorkspaceChromeProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [isHistoryOpen, setHistoryOpen] = useState(false)
  const [isMemoryOpen, setMemoryOpen] = useState(false)

  const drawers = useMemo(
    () => ({
      isDesktop,
      openHistory: () => setHistoryOpen(true),
      openMemory: () => setMemoryOpen(true),
    }),
    [isDesktop],
  )

  const [recent, setRecent] = useState<Record<string, RecentMemoryAction>>({})
  const [highlight, setHighlight] = useState<FactHighlight | null>(null)
  const nonce = useRef(0)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // `Date.now()` and the nonce bump happen only inside these callbacks — never during
  // render (react-hooks/purity).
  const recordEffects = useCallback((effects: MemoryEffect[]) => {
    if (effects.length === 0) return
    const at = Date.now()
    setRecent((current) => {
      const next = { ...current }
      for (const effect of effects) next[effect.factId] = { action: effect.action, at }
      return next
    })
  }, [])

  const showFact = useCallback(
    (factId: string) => {
      if (!isDesktop) setMemoryOpen(true)
      nonce.current += 1
      setHighlight({ factId, nonce: nonce.current })
      if (clearTimer.current) clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => setHighlight(null), HIGHLIGHT_MS)
    },
    [isDesktop],
  )

  useEffect(() => {
    const timer = clearTimer
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const activity = useMemo<MemoryActivity>(
    () => ({ recent, highlight, recordEffects, showFact }),
    [recent, highlight, recordEffects, showFact],
  )

  return (
    <WorkspaceDrawersContext value={drawers}>
      <MemoryActivityContext value={activity}>
        {/* `overflow-clip`, not `overflow-hidden`: an `overflow: hidden` box has no
          scrollbar but is still *programmatically* scrollable, so a `scrollIntoView`
          on any message silently shifts the whole shell off-screen. `overflow: clip`
          creates no scroll container at all. */}
        <div className="grid h-dvh grid-cols-1 overflow-clip xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          {isDesktop ? (
            <ChatHistoryPanel className="border-r" />
          ) : (
            <Drawer
              open={isHistoryOpen}
              onClose={() => setHistoryOpen(false)}
              side="start"
              label="Chat history"
            >
              <ChatHistoryPanel />
            </Drawer>
          )}

          {children}

          {isDesktop ? (
            <LongTermMemoryPanel className="border-l" />
          ) : (
            <Drawer
              open={isMemoryOpen}
              onClose={() => setMemoryOpen(false)}
              side="end"
              label="Long-term memory"
            >
              <LongTermMemoryPanel />
            </Drawer>
          )}
        </div>
      </MemoryActivityContext>
    </WorkspaceDrawersContext>
  )
}
