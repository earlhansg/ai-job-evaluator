'use client'

import { createContext, use } from 'react'
import type { MemoryAction, MemoryEffect } from '@/lib/schemas'

/**
 * Cross-panel memory activity: what memory learned during this visit, and which fact
 * the user asked to see.
 *
 * Writers live in Panel 2 (the send mutation, the saved-to-memory badge, criterion and
 * citation links); the reader is Panel 3, a sibling subtree. Provided by
 * `WorkspaceChrome`, which also owns the memory drawer, so `showFact` can open it below
 * 1280px.
 */
export interface RecentMemoryAction {
  action: MemoryAction
  /** Epoch ms when the effect arrived. Also the flash overlay's remount key. */
  at: number
}

export interface FactHighlight {
  factId: string
  /** Bumped per request, so asking for the same fact twice replays the flash. */
  nonce: number
}

export interface MemoryActivity {
  /** factId → the latest effect seen this page-session. Drives the New/Updated chip and the flash. */
  recent: Readonly<Record<string, RecentMemoryAction>>
  /** The fact a criterion / citation / badge asked to show. Cleared after 2s. */
  highlight: FactHighlight | null
  recordEffects: (effects: MemoryEffect[]) => void
  showFact: (factId: string) => void
}

const FALLBACK: MemoryActivity = {
  recent: {},
  highlight: null,
  recordEffects: () => {},
  showFact: () => {},
}

export const MemoryActivityContext = createContext<MemoryActivity>(FALLBACK)

/** React 19's `use()` rather than `useContext` — it may be called conditionally. */
export function useMemoryActivity(): MemoryActivity {
  return use(MemoryActivityContext)
}
