'use client'

import { createContext, use } from 'react'

/**
 * Below 1280px Panels 1 and 3 are `<dialog>` drawers, but their toggles live in
 * `ChatHeader` — inside Panel 2, a sibling subtree. Context is what connects the two
 * without lifting the panels into the page (which would defeat the route group).
 *
 * Provided by `WorkspaceChrome`.
 */
export interface WorkspaceDrawers {
  /** True when all three panels fit side by side and the drawers are not in play. */
  isDesktop: boolean
  openHistory: () => void
  openMemory: () => void
}

const DESKTOP_FALLBACK: WorkspaceDrawers = {
  isDesktop: true,
  openHistory: () => {},
  openMemory: () => {},
}

export const WorkspaceDrawersContext = createContext<WorkspaceDrawers>(DESKTOP_FALLBACK)

/** React 19's `use()` rather than `useContext` — it may be called conditionally. */
export function useWorkspaceDrawers(): WorkspaceDrawers {
  return use(WorkspaceDrawersContext)
}
