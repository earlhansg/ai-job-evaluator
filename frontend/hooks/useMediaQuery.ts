'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * `matchMedia` as React state.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: a media query *is* an
 * external store, and subscribing to one from an effect body means a cascading render
 * on every mount (which `react-hooks/set-state-in-effect` correctly rejects).
 *
 * `getServerSnapshot` returns `defaultValue`, so the server and the hydrating client
 * agree; React swaps in the real match immediately afterwards. The workspace passes
 * the desktop branch as the default — it is the layout the grid is authored for.
 */
export function useMediaQuery(query: string, defaultValue = true): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])
  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
