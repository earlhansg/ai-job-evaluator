/**
 * TEMPORARY — Phase 1 only. DELETE THIS FILE IN PHASE 2.
 *
 * Phase 1 ships the data layer and no UI, so `/` would otherwise 404 and read as a
 * broken app. This is a plain server-rendered index of the endpoints that do work, so
 * the build can be smoke-tested in a browser.
 *
 * Phase 2 replaces `/` with `app/(workspace)/page.tsx`, which redirects to the most
 * recent session. Nothing here is a component, uses the design system, or ships client
 * JS — it deliberately depends on nothing that Phase 2 has to unpick.
 */
import { keys } from '@/lib/api/keys'

export const dynamic = 'force-dynamic'

const DEMO_SESSION = 's_onsite_rejects'
const DEMO_FACT = 'f_no_onsite'

const READABLE = [
  { method: 'GET', href: keys.sessions(), note: 'all sessions, newest first' },
  { method: 'GET', href: keys.session(DEMO_SESSION), note: 'session + messages + sessionMemory' },
  { method: 'GET', href: keys.memory(), note: 'long-term memory facts + per-category counts' },
]

const WRITABLE = [
  { method: 'POST', path: keys.messages('[sessionId]'), note: 'send a message → scripted reply' },
  { method: 'PATCH', path: keys.fact(DEMO_FACT), note: '{ "pinned": boolean }' },
  { method: 'DELETE', path: keys.fact(DEMO_FACT), note: '404 on a second call' },
  { method: 'POST', path: keys.devReset(), note: 'restore seeded state (404 in production)' },
]

export default function Phase1IndexPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8 font-sans">
      <header className="flex flex-col gap-2">
        <p className="font-mono tracking-widest uppercase opacity-60">Phase 1 · data layer</p>
        <h1 className="font-semibold">AI Job Evaluator</h1>
        <p className="opacity-80">
          There is no interface yet — this phase ships the schemas, the storage seam, the compaction
          algorithm and the API. The three-panel workspace arrives in Phase 2, and replaces this
          page.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Readable in a browser</h2>
        <ul className="flex flex-col gap-2">
          {READABLE.map((route) => (
            <li key={route.href} className="flex flex-col gap-1">
              <a className="font-mono underline underline-offset-4" href={route.href}>
                <span className="opacity-60">{route.method}</span> {route.href}
              </a>
              <span className="opacity-60">{route.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Needs curl</h2>
        <ul className="flex flex-col gap-2">
          {WRITABLE.map((route) => (
            <li key={`${route.method} ${route.path}`} className="flex flex-col gap-1">
              <span className="font-mono">
                <span className="opacity-60">{route.method}</span> {route.path}
              </span>
              <span className="opacity-60">{route.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="opacity-60">
        <p>
          Every response carries <code className="font-mono">x-data-source</code> and{' '}
          <code className="font-mono">x-store-latency-ms</code>. Run with{' '}
          <code className="font-mono">AJE_LATENCY_MS=0</code> for deterministic timing.
        </p>
      </footer>
    </main>
  )
}
