'use client'

import { useMemo, useState } from 'react'
import { Drawer } from '@/components/layout/Drawer'
import { ChatHistoryPanel } from '@/components/history/ChatHistoryPanel'
import { LongTermMemoryPanel } from '@/components/memory/LongTermMemoryPanel'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { WorkspaceDrawersContext } from '@/hooks/useWorkspaceDrawers'

/** The `xl` breakpoint, in `matchMedia` terms. Keep in step with the grid below. */
const DESKTOP_QUERY = '(min-width: 1280px)'

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

  return (
    <WorkspaceDrawersContext value={drawers}>
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
    </WorkspaceDrawersContext>
  )
}
