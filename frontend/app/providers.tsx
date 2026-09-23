'use client'

/**
 * The one client boundary in the root layout.
 *
 * `SWRConfig` is React context, so it cannot live in a Server Component — and a
 * fetcher function cannot cross the RSC boundary, so `fetcher` must be referenced
 * from inside this module rather than passed down as a prop.
 *
 * Every option here is a deliberate deviation from an SWR default:
 *  - `revalidateOnFocus: false` — the browser agent driving Phase 4 steals and returns
 *    focus constantly; refetching on every focus change makes checks timing-dependent.
 *  - `keepPreviousData: true` — renders the outgoing session's transcript until the
 *    next one resolves, instead of flashing a skeleton over cached data on every
 *    session click.
 *  - `shouldRetryOnError: false` — the default retries with exponential backoff, so a
 *    deliberate 404 would take seconds to surface as an error state.
 *
 * `ToastProvider` is app-wide rather than workspace-scoped because a toast may outlive
 * a route change.
 */
import { SWRConfig } from 'swr'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { fetcher } from '@/lib/api/fetcher'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        keepPreviousData: true,
        shouldRetryOnError: false,
      }}
    >
      <ToastProvider>{children}</ToastProvider>
    </SWRConfig>
  )
}
